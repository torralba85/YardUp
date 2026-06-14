import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadUnlockError, startLeadUnlock } from "./lead-unlock-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("startLeadUnlock", () => {
  it("returns a redirect outcome when the API returns a Stripe url", async () => {
    mockFetch(200, { url: "https://stripe.test/checkout/x" });
    expect(await startLeadUnlock("r1", "tok")).toEqual({
      kind: "redirect",
      url: "https://stripe.test/checkout/x",
    });
  });

  it("returns a granted outcome for the demo path", async () => {
    mockFetch(200, { status: "granted", demo: true });
    expect(await startLeadUnlock("r1")).toEqual({ kind: "granted", demo: true });
  });

  it("posts the requestId and attaches the bearer token when provided", async () => {
    const fn = mockFetch(200, { status: "granted", demo: false });
    await startLeadUnlock("r1", "tok-123");

    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
    expect(JSON.parse(init.body as string)).toEqual({ requestId: "r1" });
  });

  it("throws LeadUnlockError carrying the server message on failure", async () => {
    mockFetch(403, { error: "Not a matched builder for this lead" });
    await expect(startLeadUnlock("r1", "tok")).rejects.toThrow(LeadUnlockError);
  });

  it("throws a friendly LeadUnlockError on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(startLeadUnlock("r1")).rejects.toThrow(/could not reach/i);
  });
});
