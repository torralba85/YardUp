import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "@/lib/scenario-share-url";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  limit: vi.fn(),
  collection: vi.fn(),
  get: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock("@/lib/server/scenario-email-rate-limit", () => ({ checkScenarioEmailRateLimit: mocks.limit }));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb: () => ({ collection: mocks.collection }) }));
vi.mock("@/lib/server/studio-scenario-email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/studio-scenario-email")>();
  return {
    ...actual,
    dispatchScenarioEmail: mocks.dispatch,
  };
});
import { POST } from "./route";
import { GET } from "../scenario-link/[token]/route";

function request(overrides = {}, origin = "https://lotfoundry.net") {
  return new NextRequest("https://lotfoundry.net/api/studio/email-scenario-link", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: " Owner@Example.COM ", marketingOptIn: false, address: EMAIL_SCENARIO.liveParcel!.address, parcelId: EMAIL_SCENARIO.parcelId, scenarioUrl: buildScenarioShareUrl(EMAIL_SCENARIO), scenario: EMAIL_SCENARIO, ...overrides }) });
}
beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimitBuckets();
  mocks.limit.mockResolvedValue(null); mocks.create.mockResolvedValue(undefined);
  mocks.dispatch.mockResolvedValue({ delivery: "queued" });
  mocks.collection.mockReturnValue({ doc: () => ({ create: mocks.create, get: mocks.get }) });
});
describe("Studio email lead API", () => {
  it.each([{ email: "invalid" }, { email: "a,b@example.com" }, { website: "bot.test" }, { marketingOptIn: "yes" }, { address: "" }, { parcelId: "other" }, { scenarioUrl: "https://lotfoundry.net.evil.test/studio" }, { scenario: { invalid: true } }])("rejects invalid payload %j", async (overrides) => {
    expect((await POST(request(overrides))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects cross-site posts before persistence", async () => {
    expect((await POST(request({}, "https://evil.test"))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("requires a live parcel instead of a preset", async () => {
    const preset = { ...EMAIL_SCENARIO, liveParcel: undefined };
    expect((await POST(request({ scenario: preset }))).status).toBe(400);
  });
  it("rejects malformed market data rather than persisting invalid headline numbers", async () => {
    expect((await POST(request({ scenario: { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, marketData: {} } } }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("queues complete payload without an email provider, including when marketing is declined", async () => {
    const response = await POST(request({ sqft: 1, buildCostLow: 1 }));
    expect(response.status).toBe(200);
    expect(mocks.collection).toHaveBeenCalledWith("studioScenarioLeads");
    const record = mocks.create.mock.calls[0][0];
    expect(record).toMatchObject({ email: "owner@example.com", marketingOptIn: false, emailDeliveryStatus: "queued_firestore", sqft: EMAIL_SCENARIO.config.footprint });
    expect(record.buildCostLow).toBeGreaterThan(1);
    expect(record.createdAt).toBeDefined();
    const url = new URL(record.scenarioUrl);
    expect(url.origin).toBe("https://lotfoundry.net");
    expect(url.searchParams.get("layout")).toMatch(/^[a-f0-9]{48}$/);
    expect(record.emailPayload.message.html).toContain("Open Your 3D Lot Layout");
    expect(record.emailPayload.message.text).toContain("$29 Certificate");
    expect(record.emailPayload.message.text).toContain("not been subscribed");
    expect(await response.json()).toEqual({ ok: true, delivery: "queued", scenarioUrl: record.scenarioUrl });
  });
  it("delivers via Resend when dispatch succeeds and sets sent_resend", async () => {
    mocks.dispatch.mockResolvedValue({ delivery: "sent", resendId: "re_msg_123" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const record = mocks.create.mock.calls[0][0];
    expect(record.emailDeliveryStatus).toBe("sent_resend");
    expect(record.resendId).toBe("re_msg_123");
    expect(await response.json()).toEqual({ ok: true, delivery: "sent", scenarioUrl: record.scenarioUrl });
  });
  it("records independent marketing opt-in and escapes user-controlled HTML", async () => {
    const address = '<img src=x onerror="bad()">';
    await POST(request({ address, marketingOptIn: true, scenario: { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, address } } }));
    const record = mocks.create.mock.calls[0][0];
    expect(record.marketingOptIn).toBe(true);
    expect(record.emailPayload.message.html).toContain("&lt;img");
    expect(record.emailPayload.message.html).not.toContain("<img");
    expect(record.emailPayload.message.text).toContain("opted in");
  });
  it("honors shared rate limits without writing a queue record", async () => {
    mocks.limit.mockResolvedValue(NextResponse.json({ error: "Try later" }, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not claim success if Firestore fails", async () => {
    mocks.create.mockRejectedValue(new Error("offline"));
    expect((await POST(request())).status).toBe(503);
  });
  it("returns only the public design and refuses malformed or missing snapshots", async () => {
    const params = { params: Promise.resolve({ token: "a".repeat(48) }) };
    mocks.get.mockResolvedValue({ data: () => ({ email: "private@example.com", marketingOptIn: true, emailPayload: { private: true }, scenarioSnapshot: JSON.stringify({ ...EMAIL_SCENARIO, email: "private@example.com", projectBrief: { paid: true } }) }) });
    const response = await GET(new Request("https://lotfoundry.net"), params);
    const payload = await response.json();
    expect(payload.scenario.pose).toEqual(EMAIL_SCENARIO.pose);
    expect(JSON.stringify(payload)).not.toContain("private@example.com");
    expect(JSON.stringify(payload)).not.toContain("projectBrief");
    expect(response.headers.get("cache-control")).toContain("no-store");
    mocks.get.mockResolvedValue({ data: () => undefined });
    expect((await GET(new Request("https://lotfoundry.net"), params)).status).toBe(404);
    expect((await GET(new Request("https://lotfoundry.net"), { params: Promise.resolve({ token: "bad" }) })).status).toBe(404);
  });
  it("persists real GeoJSON without Firestore nested arrays and restores its complete geometry", async () => {
    const boundaryGeoJson = { type: "Polygon", coordinates: [[[-121.89, 37.33], [-121.88, 37.33], [-121.88, 37.34], [-121.89, 37.33]]] };
    const scenario = { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, boundaryGeoJson } };
    expect((await POST(request({ scenario }))).status).toBe(200);
    const record = mocks.create.mock.calls[0][0];
    expect(typeof record.scenarioSnapshot).toBe("string");
    expect(JSON.parse(record.scenarioSnapshot).liveParcel.boundaryGeoJson).toEqual(boundaryGeoJson);
    mocks.get.mockResolvedValue({ data: () => record });
    const response = await GET(new Request("https://lotfoundry.net"), { params: Promise.resolve({ token: "a".repeat(48) }) });
    expect((await response.json()).scenario.liveParcel.boundaryGeoJson).toEqual(boundaryGeoJson);
  });
  it("throttles excessive bearer token lookups with 429", async () => {
    const params = { params: Promise.resolve({ token: "a".repeat(48) }) };
    mocks.get.mockResolvedValue({ data: () => ({ scenarioSnapshot: JSON.stringify(EMAIL_SCENARIO) }) });
    for (let i = 0; i < 60; i++) {
      const res = await GET(new Request("https://lotfoundry.net"), params);
      expect(res.status).toBe(200);
    }
    const limited = await GET(new Request("https://lotfoundry.net"), params);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeDefined();
    expect(limited.headers.get("cache-control")).toContain("no-store");
  });
});
