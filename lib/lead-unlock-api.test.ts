import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import {
  LeadUnlockError,
  leadUnlockPayLabel,
  leadUnlockSecureNote,
  startLeadUnlock,
} from "./lead-unlock-api";

const channelMocks = vi.hoisted(() => ({
  detectPurchaseChannel: vi.fn((): "web" | "app-store" | "google-play" => "web"),
  requiresStoreBilling: vi.fn((ch: string) => ch !== "web"),
  purchase: vi.fn(async () => ({
    platform: "app-store" as const,
    productId: STORE_PRODUCTS.builder1.id,
    token: "demo:lead-1",
  })),
}));

vi.mock("@/lib/commerce/purchase-channel", () => ({
  detectPurchaseChannel: () => channelMocks.detectPurchaseChannel(),
  requiresStoreBilling: (ch: string) => channelMocks.requiresStoreBilling(ch),
}));

vi.mock("@/lib/commerce/purchase-client", () => ({
  PurchaseClientError: class PurchaseClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PurchaseClientError";
    }
  },
  createPurchaseClient: () => ({
    channel: "app-store",
    purchase: channelMocks.purchase,
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  channelMocks.detectPurchaseChannel.mockReturnValue("web");
  channelMocks.requiresStoreBilling.mockImplementation((ch: string) => ch !== "web");
  channelMocks.purchase.mockClear();
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

describe("leadUnlockPayLabel", () => {
  it("labels credit, Stripe, App Store, and Play paths", () => {
    expect(leadUnlockPayLabel(true, "web")).toBe("Unlock with 1 Credit");
    expect(leadUnlockPayLabel(false, "web")).toBe("Pay with Stripe");
    expect(leadUnlockPayLabel(false, "app-store")).toBe("Pay with App Store");
    expect(leadUnlockPayLabel(false, "google-play")).toBe("Pay with Google Play");
  });
});

describe("leadUnlockSecureNote", () => {
  it("names the active billing channel", () => {
    expect(leadUnlockSecureNote(false, "web")).toMatch(/Stripe/i);
    expect(leadUnlockSecureNote(false, "app-store")).toMatch(/App Store/i);
    expect(leadUnlockSecureNote(false, "google-play")).toMatch(/Google Play/i);
  });
});

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

  it("on store channels buys one lead credit then spends it via unlock-credit", async () => {
    channelMocks.detectPurchaseChannel.mockReturnValue("app-store");
    channelMocks.requiresStoreBilling.mockReturnValue(true);
    const fn = mockFetch(200, { success: true, newCredits: 0 });

    const out = await startLeadUnlock("lead-99", "tok");
    expect(out).toEqual({ kind: "granted", demo: false });
    expect(channelMocks.purchase).toHaveBeenCalledWith(STORE_PRODUCTS.builder1.id);
    expect(fn).toHaveBeenCalledWith(
      "/api/lead/unlock-credit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requestId: "lead-99" }),
      }),
    );
    // Must not hit Stripe checkout on store channels.
    expect(fn.mock.calls.some((c) => String(c[0]).includes("/api/stripe/checkout"))).toBe(
      false,
    );
  });

  it("does not call Stripe checkout on google-play channel", async () => {
    channelMocks.detectPurchaseChannel.mockReturnValue("google-play");
    channelMocks.requiresStoreBilling.mockReturnValue(true);
    const fn = mockFetch(200, { success: true, newCredits: 0 });
    await startLeadUnlock("lead-1", "tok");
    expect(channelMocks.purchase).toHaveBeenCalledWith(STORE_PRODUCTS.builder1.id);
    expect(String(fn.mock.calls[0][0])).toBe("/api/lead/unlock-credit");
  });
});
