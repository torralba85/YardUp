import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { buildScenarioShareUrl } from "@/lib/scenario-url";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  limit: vi.fn(),
  collection: vi.fn(),
  get: vi.fn(),
  dispatch: vi.fn(),
  appCheck: vi.fn(),
}));
vi.mock("@/lib/server/app-check", () => ({ verifyLimitedUseAppCheck: mocks.appCheck }));
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
  mocks.update.mockResolvedValue(undefined);
  mocks.dispatch.mockResolvedValue({ delivery: "queued" });
  mocks.appCheck.mockResolvedValue("valid");
  mocks.collection.mockReturnValue({ doc: () => ({ create: mocks.create, update: mocks.update, get: mocks.get }) });
});
describe("Studio email lead API", () => {
  it.each([{ email: "invalid" }, { email: "a,b@example.com" }, { website: "bot.test" }, { marketingOptIn: "yes" }, { address: "" }, { parcelId: "other" }, { scenarioUrl: "https://lotfoundry.net.evil.test/studio" }, { scenario: { invalid: true } }])("rejects invalid payload %j", async (overrides) => {
    expect((await POST(request(overrides))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    ["a link in the address", { address: "Claim your refund at https://evil.test" }],
    ["a bare domain in the address", { address: "123 Main St, see evil-site.com" }],
    ["an email address in the city", { city: "help@evil.test" }],
    ["a line break in the address", { address: "123 Main St\nCall 555-0100" }],
    ["an overlong address", { address: "1".repeat(121) }],
  ])("rejects %s before App Check, quota or persistence", async (_label, fields) => {
    const liveParcel = { ...EMAIL_SCENARIO.liveParcel!, ...fields };
    expect((await POST(request({ address: liveParcel.address, scenario: { ...EMAIL_SCENARIO, liveParcel } }))).status).toBe(400);
    expect(mocks.appCheck).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects a market area label that would carry a link into the rent basis line", async () => {
    const liveParcel = { ...EMAIL_SCENARIO.liveParcel!, marketData: { ...EMAIL_SCENARIO.liveParcel!.marketData!, area: "Claim it at evil-site.com" } };
    expect((await POST(request({ scenario: { ...EMAIL_SCENARIO, liveParcel } }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(["missing", "invalid"] as const)("refuses a request whose App Check token is %s before quota or persistence", async (verdict) => {
    mocks.appCheck.mockResolvedValue(verdict);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/verify this browser/);
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("asks the browser to retry when App Check verification is unavailable", async () => {
    mocks.appCheck.mockResolvedValue("unavailable");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("limits by recipient as well as by client", async () => {
    await POST(request());
    expect(mocks.limit).toHaveBeenCalledWith(expect.anything(), "owner@example.com");
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
  it("delivers via Resend when dispatch succeeds and then records sent_resend", async () => {
    mocks.dispatch.mockResolvedValue({ delivery: "sent", resendId: "re_msg_123" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const record = mocks.create.mock.calls[0][0];
    expect(record.emailDeliveryStatus).toBe("queued_firestore");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({ emailDeliveryStatus: "sent_resend", resendId: "re_msg_123" });
    expect(await response.json()).toEqual({ ok: true, delivery: "sent", scenarioUrl: record.scenarioUrl });
  });
  it("saves the layout before emailing it and hands the provider the same token and link", async () => {
    mocks.dispatch.mockResolvedValue({ delivery: "sent", resendId: "re_msg_123" });
    await POST(request());
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.dispatch.mock.invocationCallOrder[0]);
    const record = mocks.create.mock.calls[0][0];
    const [to, message, token] = mocks.dispatch.mock.calls[0];
    expect(to).toBe("owner@example.com");
    // The email is rendered once: the provider gets exactly the saved payload.
    expect(message).toEqual(record.emailPayload.message);
    expect(message.text).toContain(record.scenarioUrl);
    expect(new URL(record.scenarioUrl).searchParams.get("layout")).toBe(token);
  });
  it("never calls the email provider when the snapshot cannot be saved", async () => {
    mocks.create.mockRejectedValue(new Error("offline"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("leaves the queued status alone when the provider did not accept the email", async () => {
    mocks.dispatch.mockResolvedValue({ delivery: "queued", error: "domain not verified" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).delivery).toBe("queued");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("still reports success when only the post-send status update fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.dispatch.mockResolvedValue({ delivery: "sent", resendId: "re_msg_123" });
    mocks.update.mockRejectedValue(new Error("firestore unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).delivery).toBe("sent");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
  it("degrades to queued instead of a 503 if the dispatcher throws after the snapshot is saved", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.dispatch.mockRejectedValue(new Error("unexpected"));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).delivery).toBe("queued");
    expect(mocks.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
  it("rejects markup in the address outright", async () => {
    const address = '<img src=x onerror="bad()">';
    expect((await POST(request({ address, scenario: { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, address } } }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("records independent marketing opt-in and still escapes address punctuation in HTML", async () => {
    const address = "12 O'Neil & Main St.";
    await POST(request({ address, marketingOptIn: true, scenario: { ...EMAIL_SCENARIO, liveParcel: { ...EMAIL_SCENARIO.liveParcel, address } } }));
    const record = mocks.create.mock.calls[0][0];
    expect(record.marketingOptIn).toBe(true);
    expect(record.emailPayload.message.html).toContain("12 O&#39;Neil &amp; Main St.");
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
