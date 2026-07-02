import { afterEach, describe, expect, it, vi } from "vitest";
import { CertificateCheckoutError, startCertificateCheckout } from "./certificate-checkout";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(response: { ok: boolean; status?: number; json: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status ?? 200,
      json: async () => response.json,
    }),
  );
}

describe("startCertificateCheckout", () => {
  it("returns a redirect for a real Stripe session url", async () => {
    mockFetch({ ok: true, json: { url: "https://checkout.stripe.com/x" } });
    const out = await startCertificateCheckout({ certKey: "k", parcelName: "413 Elmwood, Seattle" });
    expect(out).toEqual({ kind: "redirect", url: "https://checkout.stripe.com/x" });
  });

  it("returns granted for the demo path", async () => {
    mockFetch({ ok: true, json: { status: "granted", demo: true } });
    const out = await startCertificateCheckout({ certKey: "k", parcelName: "x" });
    expect(out).toEqual({ kind: "granted", demo: true });
  });

  it("returns granted when already purchased", async () => {
    mockFetch({ ok: true, json: { status: "granted", alreadyPurchased: true } });
    const out = await startCertificateCheckout({ certKey: "k", parcelName: "x" });
    expect(out.kind).toBe("granted");
  });

  it("sends the id token as a bearer header when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: "u" }) });
    vi.stubGlobal("fetch", fetchMock);
    await startCertificateCheckout({ certKey: "k", parcelName: "x", idToken: "TOKEN" });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer TOKEN");
    expect(JSON.parse(init.body)).toMatchObject({ certKey: "k", parcelName: "x" });
  });

  it("throws a user-facing error on a failed response", async () => {
    mockFetch({ ok: false, status: 402, json: { error: "Payments are not available." } });
    await expect(startCertificateCheckout({ certKey: "k", parcelName: "x" })).rejects.toBeInstanceOf(
      CertificateCheckoutError,
    );
  });
});
