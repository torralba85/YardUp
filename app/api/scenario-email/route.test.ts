import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { defaultScenarioState } from "@/lib/scenario-url";
const mocks = vi.hoisted(() => ({
  configured: vi.fn(), send: vi.fn(), limit: vi.fn(), set: vi.fn(), update: vi.fn(), remove: vi.fn(), get: vi.fn(),
}));
vi.mock("@/lib/server/scenario-mail", () => ({ scenarioMailConfigured: mocks.configured, sendScenarioMail: mocks.send }));
vi.mock("@/lib/server/scenario-email-rate-limit", () => ({ checkScenarioEmailRateLimit: mocks.limit }));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdminDb: () => ({ collection: () => ({ doc: () => ({ set: mocks.set, update: mocks.update, delete: mocks.remove, get: mocks.get }) }) }) }));
import { POST } from "./route";
import { GET } from "./[token]/route";

function request(overrides = {}, origin = "https://lotfoundry.net") {
  return new NextRequest("https://lotfoundry.net/api/scenario-email", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", consent: true, scenario: defaultScenarioState, ...overrides }) });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.configured.mockReturnValue(true); mocks.send.mockResolvedValue(undefined); mocks.limit.mockResolvedValue(null);
  mocks.set.mockResolvedValue(undefined); mocks.update.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
describe("guest layout email", () => {
  it("requires consent, a single recipient, valid design and same-site submission", async () => {
    expect((await POST(request({ consent: false }))).status).toBe(400);
    expect((await POST(request({ email: "a,b@example.com" }))).status).toBe(400);
    expect((await POST(request({ scenario: { invalid: true } }))).status).toBe(400);
    expect((await POST(request({}, "https://evil.example"))).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("returns unavailable and collects nothing if outbound mail is disabled", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("honors the shared send ceiling before writing or sending", async () => {
    mocks.limit.mockResolvedValue(NextResponse.json({ error: "Try later" }, { status: 429 }));
    expect((await POST(request())).status).toBe(429);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("persists bounded consented data, strips paid content, and sends an opaque token", async () => {
    const response = await POST(request({ scenario: { ...defaultScenarioState, projectBrief: { paid: true } } }));
    expect(response.status).toBe(200);
    const record = mocks.set.mock.calls[0][0];
    expect(record.email).toBe("owner@example.com"); expect(record.scenario).not.toHaveProperty("projectBrief");
    expect(record.expiresAt.toMillis() - record.createdAt.toMillis()).toBeCloseTo(30 * 86400_000, -2);
    expect(mocks.send).toHaveBeenCalledWith("owner@example.com", expect.stringMatching(/^[a-f0-9]{48}$/));
    expect(await response.text()).not.toContain("owner@example.com");
  });
  it("reports SMTP failure and deletes the failed capture instead of claiming success", async () => {
    mocks.send.mockRejectedValue(new Error("failed"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.remove).toHaveBeenCalled();
  });
  it("returns only the layout, never its recipient, and refuses expired links", async () => {
    const params = { params: Promise.resolve({ token: "a".repeat(48) }) };
    mocks.get.mockResolvedValue({ data: () => ({ email: "private@example.com", scenario: defaultScenarioState, expiresAt: { toMillis: () => Date.now() + 10000 } }) });
    const response = await GET(new Request("https://lotfoundry.net"), params);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload.scenario).toMatchObject(defaultScenarioState);
    expect(payload).not.toHaveProperty("email");
    mocks.get.mockResolvedValue({ data: () => ({ scenario: defaultScenarioState, expiresAt: { toMillis: () => 0 } }) });
    expect((await GET(new Request("https://lotfoundry.net"), params)).status).toBe(404);
  });
  it("revalidates stored snapshots and strips unexpected private or paid fields on retrieval", async () => {
    const params = { params: Promise.resolve({ token: "a".repeat(48) }) };
    mocks.get.mockResolvedValue({ data: () => ({ scenario: { ...defaultScenarioState, email: "private@example.com", projectBrief: { paid: true } }, expiresAt: { toMillis: () => Date.now() + 10000 } }) });
    const response = await GET(new Request("https://lotfoundry.net"), params);
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("private@example.com");
    expect(text).not.toContain("projectBrief");
    mocks.get.mockResolvedValue({ data: () => ({ scenario: { invalid: true }, expiresAt: { toMillis: () => Date.now() + 10000 } }) });
    expect((await GET(new Request("https://lotfoundry.net"), params)).status).toBe(404);
  });
});
