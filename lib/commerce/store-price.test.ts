import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "./products";
import type { PurchaseChannelWindow } from "./purchase-channel";
import { clearStorePriceCache, useStorePrice } from "./store-price";

/**
 * A Play billing stub whose `getDetails` answers with the price-charmed amounts
 * the Console actually persists — $49 base sells for $48.99.
 */
function playWindow(
  details: Array<{ itemId: string; price: { value: number | string; currency: string } }>,
) {
  const getDetails = vi.fn(async () => details);
  const win = {
    getDigitalGoodsService: vi.fn(async () => ({ getDetails })),
  } as unknown as PurchaseChannelWindow;
  return { win, getDetails };
}

afterEach(() => {
  clearStorePriceCache();
  vi.restoreAllMocks();
});

describe("useStorePrice on the web channel", () => {
  it("quotes the Stripe catalog amount", () => {
    const { result } = renderHook(() => useStorePrice("builder1"), {});

    expect(result.current.channel).toBe("web");
    expect(result.current.amount).toBe("$49.00");
    expect(result.current.amountCompact).toBe("$49");
    expect(result.current.exact).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("divides a pack total into its per-credit price", () => {
    const { result } = renderHook(() => useStorePrice("builder10"));

    expect(result.current.amountCompact).toBe("$300");
    expect(result.current.unitAmount).toBe("$30");
  });

  it("quotes the certificate at the flat certificate price", () => {
    const { result } = renderHook(() => useStorePrice("certificate"));

    expect(result.current.amountCompact).toBe("$29");
  });
});

describe("useStorePrice on the Google Play channel", () => {
  it("quotes Play's charmed price, not the Stripe base", async () => {
    const { win } = playWindow([
      { itemId: STORE_PRODUCTS.builder1.id, price: { value: "48.99", currency: "USD" } },
    ]);

    const { result } = renderHook(() =>
      useStorePrice("builder1", { channel: "google-play", win }),
    );

    await waitFor(() => expect(result.current.exact).toBe(true));
    expect(result.current.amount).toBe("$48.99");
    // A charmed price keeps its cents even in the compact slot; dropping them
    // would restate $48.99 as the $49 the buyer is never charged.
    expect(result.current.amountCompact).toBe("$48.99");
  });

  it("localizes the amount and currency Play reports", async () => {
    const { win } = playWindow([
      { itemId: STORE_PRODUCTS.builder5.id, price: { value: 159.99, currency: "GBP" } },
    ]);

    const { result } = renderHook(() =>
      useStorePrice("builder5", { channel: "google-play", win }),
    );

    await waitFor(() => expect(result.current.exact).toBe(true));
    expect(result.current.amount).toContain("159.99");
    expect(result.current.amount).toContain("£");
    expect(result.current.unitAmount).toContain("32.00");
  });

  it("never falls back to the Stripe amount while Play is still answering", async () => {
    const { win } = playWindow([
      { itemId: STORE_PRODUCTS.builder10.id, price: { value: 299.99, currency: "USD" } },
    ]);

    const { result } = renderHook(() =>
      useStorePrice("builder10", { channel: "google-play", win }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.exact).toBe(false);
    expect(result.current.amount).not.toContain("300");

    // Settle before the test ends: the lookup writes its shared cache entry
    // asynchronously, so an unawaited hook would leak it past cleanup.
    await waitFor(() => expect(result.current.exact).toBe(true));
    expect(result.current.amount).toBe("$299.99");
  });

  it("reports an error instead of a price when Play omits the product", async () => {
    const { win } = playWindow([]);

    const { result } = renderHook(() =>
      useStorePrice("certificate", { channel: "google-play", win }),
    );

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toMatch(/unavailable/i);
    expect(result.current.exact).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.amount).not.toContain("29");
  });

  it("issues one getDetails call for a product no matter how many cards ask", async () => {
    const { win, getDetails } = playWindow([
      { itemId: STORE_PRODUCTS.builder1.id, price: { value: 48.99, currency: "USD" } },
    ]);

    const first = renderHook(() =>
      useStorePrice("builder1", { channel: "google-play", win }),
    );
    const second = renderHook(() =>
      useStorePrice("builder1", { channel: "google-play", win }),
    );

    await waitFor(() => expect(first.result.current.exact).toBe(true));
    await waitFor(() => expect(second.result.current.exact).toBe(true));
    expect(getDetails).toHaveBeenCalledTimes(1);
  });
});

describe("useStorePrice on the App Store channel", () => {
  it("defers to StoreKit rather than quoting the Stripe amount", () => {
    const { result } = renderHook(() =>
      useStorePrice("certificate", { channel: "app-store" }),
    );

    expect(result.current.exact).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.amount).not.toContain("29");
  });
});
