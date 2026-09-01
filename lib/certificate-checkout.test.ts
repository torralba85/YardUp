import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import { CertificateCheckoutError, startCertificateCheckout } from "./certificate-checkout";

const purchaseMocks = vi.hoisted(() => ({
  detectPurchaseChannel: vi.fn((): "web" | "app-store" | "google-play" => "web"),
  requiresStoreBilling: vi.fn((ch: string) => ch !== "web"),
  purchase: vi.fn(
    async (): Promise<{
      platform: "app-store" | "google-play" | "web";
      productId: string;
      token: string;
      certKey?: string;
    }> => ({
      platform: "app-store",
      productId: STORE_PRODUCTS.certificate.id,
      token: "demo:jws",
    }),
  ),
  createPurchaseClient: vi.fn(),
}));

vi.mock("@/lib/commerce/purchase-channel", () => ({
  detectPurchaseChannel: () => purchaseMocks.detectPurchaseChannel(),
  requiresStoreBilling: (ch: string) => purchaseMocks.requiresStoreBilling(ch),
}));

vi.mock("@/lib/commerce/purchase-client", () => ({
  PurchaseClientError: class PurchaseClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PurchaseClientError";
    }
  },
  createPurchaseClient: (opts: unknown) => {
    purchaseMocks.createPurchaseClient(opts);
    return { channel: "app-store", purchase: purchaseMocks.purchase };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  purchaseMocks.detectPurchaseChannel.mockReturnValue("web");
  purchaseMocks.requiresStoreBilling.mockImplementation((ch: string) => ch !== "web");
  purchaseMocks.purchase.mockClear();
  purchaseMocks.createPurchaseClient.mockClear();
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
    const out = await startCertificateCheckout({
      certKey: "k",
      parcelName: "413 Elmwood, Seattle",
    });
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "u" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await startCertificateCheckout({ certKey: "k", parcelName: "x", idToken: "TOKEN" });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer TOKEN");
    expect(JSON.parse(init.body)).toMatchObject({
      certKey: "k",
      parcelName: "x",
      checkoutAttemptId: expect.any(String),
    });
  });

  it("throws a user-facing error on a failed response", async () => {
    mockFetch({ ok: false, status: 402, json: { error: "Payments are not available." } });
    await expect(
      startCertificateCheckout({ certKey: "k", parcelName: "x" }),
    ).rejects.toBeInstanceOf(CertificateCheckoutError);
  });

  it("on store channels purchases the certificate SKU with the lot certKey", async () => {
    purchaseMocks.detectPurchaseChannel.mockReturnValue("app-store");
    purchaseMocks.requiresStoreBilling.mockReturnValue(true);
    purchaseMocks.purchase.mockResolvedValue({
      platform: "app-store",
      productId: STORE_PRODUCTS.certificate.id,
      token: "demo:store-jws",
      certKey: "lot-key-42",
    });

    const out = await startCertificateCheckout({
      certKey: "lot-key-42",
      parcelName: "42 Oak St",
      idToken: "id-tok",
    });

    expect(out).toEqual({ kind: "granted", demo: false });
    expect(purchaseMocks.purchase).toHaveBeenCalledWith(STORE_PRODUCTS.certificate.id, {
      certKey: "lot-key-42",
    });
  });
});
