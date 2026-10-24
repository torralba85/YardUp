// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { verifyAttomOnProduction } from "./attom-canary.mjs";

function matched() {
  return { dataQuality: {
    providerAttempts: [{ provider: "ATTOM", outcome: "matched" }],
    addressVerification: { status: "observed", source: { provider: "ATTOM", recordId: "123456" } },
  } };
}

describe("live ATTOM production canary", () => {
  it("uses the authenticated live parcel API and returns only the check outcome", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...matched(), private: "do not return" }));
    expect(await verifyAttomOnProduction("test-id-token", "test-app-check", fetchMock)).toEqual({ provider: "ATTOM", outcome: "matched" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).origin).toBe("https://lotfoundry.net");
    expect(new URL(url).pathname).toBe("/api/parcel");
    expect(new URL(url).searchParams.get("address")).toBe("4529 Winona Court, Denver, CO 80212");
    expect(init).toMatchObject({ headers: { Authorization: "Bearer test-id-token", "X-Firebase-AppCheck": "test-app-check" }, redirect: "error", cache: "no-store" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("requires authentication before making a request", async () => {
    const fetchMock = vi.fn();
    await expect(verifyAttomOnProduction("", undefined, fetchMock)).rejects.toThrow("requires a signed-in");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["no-match", "unsupported", "timeout", "auth-failed", "provider-error", "invalid-response"])("rejects silent provider fallback: %s", async (outcome) => {
    const data = matched(); data.dataQuality.providerAttempts[0].outcome = outcome;
    await expect(verifyAttomOnProduction("test-token", undefined, vi.fn().mockResolvedValue(Response.json(data)))).rejects.toThrow(outcome);
  });

  it.each([{}, { dataQuality: { providerAttempts: [{ provider: "ATTOM", outcome: "matched" }] } },
    { dataQuality: { ...matched().dataQuality, addressVerification: { status: "defaulted", source: { provider: "ATTOM", recordId: "123" } } } },
  ])("rejects missing or unsupported address evidence", async (data) => {
    await expect(verifyAttomOnProduction("test-token", undefined, vi.fn().mockResolvedValue(Response.json(data)))).rejects.toThrow("missing address evidence");
  });

  it("does not expose HTTP bodies or network error contents", async () => {
    await expect(verifyAttomOnProduction("test-token", undefined, vi.fn().mockResolvedValue(new Response("sensitive provider body", { status: 503 })))).rejects.toThrow("HTTP 503");
    await expect(verifyAttomOnProduction("test-token", undefined, vi.fn().mockRejectedValue(new Error("sensitive token")))).rejects.toThrow("failed or timed out");
  });
});
