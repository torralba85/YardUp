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
  matchMedia?: (query: string) => { matches: boolean };
  document?: { referrer: string };
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
 * Order: native bridge/referral → ordinary browser → Digital Goods (Play) → web.
 * Digital Goods API exposure alone does not mean this tab is a store app.
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

  if (win.webkit?.messageHandlers?.lotfoundryStore) {
    return "app-store";
  }

  // A TWA can fall back to a Custom Tab when its origin cannot be verified.
  // Keep that known Android shell on store billing even with browser chrome.
  if (/^android-app:\/\/com\.lotfoundry\.app(?:\/|$)/.test(win.document?.referrer ?? "")) {
    return "google-play";
  }

  // Edge/Chromium can expose Digital Goods in ordinary tabs, where requesting
  // Play Billing rejects with "unsupported context". These visitors use Stripe.
  // Do not infer an installed app from API presence or the screen width.
  if (win.matchMedia?.("(display-mode: browser)").matches) {
    return "web";
  }

  if (typeof win.getDigitalGoodsService === "function") {
    return "google-play";
  }

  return "web";
}

/**
 * Whether the page is running inside a LotFoundry native shell (the Android
 * TWA or the iOS WKWebView) rather than an open browser. Screen width is not a
 * signal: a phone browser is still the web product.
 */
export function isNativeAppShell(
  win: PurchaseChannelWindow | null | undefined = typeof window !== "undefined"
    ? (window as unknown as PurchaseChannelWindow)
    : undefined,
): boolean {
  return detectPurchaseChannel(win) !== "web";
}

/** Whether the channel must use store billing (not Stripe) for digital goods. */
export function requiresStoreBilling(channel: PurchaseChannel): boolean {
  return channel === "app-store" || channel === "google-play";
}
