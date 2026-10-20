import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import {
  CertificateCheckoutError,
  startCertificateCheckout,
  warmCertificateCheckout,
} from "./certificate-checkout";

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
  window.localStorage.clear();
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

  it.each([
    { url: "not-a-url" },
    { url: "javascript:alert(1)" },
    { url: "http://checkout.stripe.com/x" },
    { url: 123 },
    { url: "" },
    {},
    null,
  ])("rejects an invalid Checkout response %j", async (json) => {
    mockFetch({ ok: true, json });
    await expect(startCertificateCheckout({ certKey: "k", parcelName: "x" }))
      .rejects.toBeInstanceOf(CertificateCheckoutError);
  });

  it("accepts the configured custom Stripe Checkout domain", async () => {
    mockFetch({ ok: true, json: { url: "https://pay.lotfoundry.net/c/pay/test" } });
    expect(await startCertificateCheckout({ certKey: "k", parcelName: "x" }))
      .toEqual({ kind: "redirect", url: "https://pay.lotfoundry.net/c/pay/test" });
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
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
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

  it("reuses the checkout attempt for a retry of the same certificate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/test" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await startCertificateCheckout({ certKey: "lot-1", parcelName: "x" });
    await startCertificateCheckout({ certKey: "lot-1", parcelName: "x" });

    const first = JSON.parse(fetchMock.mock.calls[0][1].body).checkoutAttemptId;
    const second = JSON.parse(fetchMock.mock.calls[1][1].body).checkoutAttemptId;
    expect(second).toBe(first);
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

describe("warmCertificateCheckout", () => {
  const HOUR_MS = 60 * 60 * 1000;
  // The warm-up remembers when it last ran, so every case starts an hour later
  // than the one before it instead of resetting module state.
  let clock = Date.UTC(2026, 9, 19);

  function startClock() {
    clock += HOUR_MS;
    vi.useFakeTimers();
    vi.setSystemTime(clock);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("wakes the checkout function with an anonymous, uncacheable GET on the web channel", () => {
    startClock();
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    warmCertificateCheckout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout-certificate", {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
    });
  });

  it("does not repeat while the instance it woke is still warm, then refreshes it", () => {
    startClock();
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    warmCertificateCheckout();
    vi.advanceTimersByTime(5 * 60 * 1000);
    warmCertificateCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(6 * 60 * 1000);
    warmCertificateCheckout();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves store channels alone, because they never reach Stripe", () => {
    startClock();
    purchaseMocks.detectPurchaseChannel.mockReturnValue("google-play");
    purchaseMocks.requiresStoreBilling.mockReturnValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    warmCertificateCheckout();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never surfaces a failed wake-up to the buyer", async () => {
    startClock();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    expect(() => warmCertificateCheckout()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
  });
});
