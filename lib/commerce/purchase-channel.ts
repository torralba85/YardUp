/**
 * Purchase channel detection for web vs store-wrapped clients.
 *
 * - `web` — open browser; Stripe Checkout
 * - `app-store` — iOS WKWebView with LotFoundry StoreKit bridge
 * - `google-play` — Android TWA with Digital Goods API / Play Billing
 */

export type PurchaseChannel = "web" | "app-store" | "google-play";

/** Minimal window surface used for channel detection (injectable in tests). */
export interface PurchaseChannelWindow {
  getDigitalGoodsService?: (serviceProvider: string) => unknown;
  webkit?: {
    messageHandlers?: {
      lotfoundryStore?: unknown;
    };
  };
  /** Explicit bridge flag set by native shells when webkit handlers are opaque. */
  LotFoundryNative?: {
    platform?: "ios" | "android";
  };
}

/**
 * Detect which commerce channel should handle digital purchases.
 *
 * Order: explicit native bridge → Digital Goods (Play) → StoreKit bridge → web.
 */
export function detectPurchaseChannel(
  win: PurchaseChannelWindow | null | undefined = typeof window !== "undefined"
    ? (window as unknown as PurchaseChannelWindow)
    : undefined,
): PurchaseChannel {
  if (!win) return "web";

  const nativePlatform = win.LotFoundryNative?.platform;
  if (nativePlatform === "ios") return "app-store";
  if (nativePlatform === "android") return "google-play";

  if (typeof win.getDigitalGoodsService === "function") {
    return "google-play";
  }

  if (win.webkit?.messageHandlers?.lotfoundryStore) {
    return "app-store";
  }

  return "web";
}

/** Whether the channel must use store billing (not Stripe) for digital goods. */
export function requiresStoreBilling(channel: PurchaseChannel): boolean {
  return channel === "app-store" || channel === "google-play";
}
