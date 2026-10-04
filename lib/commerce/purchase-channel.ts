/**
 * Purchase channel detection for web vs store-wrapped clients.
 *
 * - `web` — open browser; Stripe Checkout
 * - `app-store` — iOS WKWebView with LotFoundry StoreKit bridge
 * - `google-play` — Android TWA with Digital Goods API / Play Billing
 */

export type PurchaseChannel = "web" | "app-store" | "google-play";

/** Chrome sets this referrer on the document the Play app (TWA) launches into. */
const ANDROID_APP_REFERRER = /^android-app:\/\/com\.lotfoundry\.app(?:\/|$)/;

/**
 * Session-storage key remembering that this tab is the Play app. The launch
 * referrer is lost on the next full-page navigation (a reload, or sign-out's
 * `location.replace`), so the launch document records it for the tab session.
 */
export const ANDROID_APP_SESSION_KEY = "lotfoundry:android-app";

/** Minimal window surface used for channel detection (injectable in tests). */
export interface PurchaseChannelWindow {
  getDigitalGoodsService?: (serviceProvider: string) => unknown;
  document?: { referrer: string };
  sessionStorage?: Pick<Storage, "getItem" | "setItem"> | null;
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
 * Whether this tab was launched by the LotFoundry Play app: its launch
 * referrer, or the session marker an earlier document in the tab recorded.
 * Blocked storage falls back to the current document's referrer alone.
 */
function isAndroidAppSession(win: PurchaseChannelWindow): boolean {
  let storage: PurchaseChannelWindow["sessionStorage"];
  try {
    storage = win.sessionStorage;
    if (storage?.getItem(ANDROID_APP_SESSION_KEY) === "1") return true;
  } catch {
    // Storage access can throw when site data is blocked.
  }

  if (!ANDROID_APP_REFERRER.test(win.document?.referrer ?? "")) return false;
  try {
    storage?.setItem(ANDROID_APP_SESSION_KEY, "1");
  } catch {
    // Same as above; this document still reads its own referrer.
  }
  return true;
}

/**
 * Detect which commerce channel should handle digital purchases.
 *
 * Order: native bridge flag → StoreKit handler → Play app session → web.
 * Digital Goods API presence is not a signal: Edge/Chromium expose it in
 * ordinary tabs, installed PWAs and fullscreen windows, where requesting Play
 * Billing rejects with "unsupported context". Only the Play app's launch
 * referrer identifies the TWA, including its Custom Tab fallback.
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

  // A Play-distributed app stays on Play Billing even in the Custom Tab
  // fallback, where purchases fail visibly rather than offering Stripe.
  if (isAndroidAppSession(win)) {
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
