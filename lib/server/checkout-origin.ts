const DEFAULT_PRODUCTION_ORIGIN =
  "https://yardup-2026.web.app";

/**
 * Resolve the absolute app origin used for Stripe Checkout success/cancel URLs.
 * In production, do not trust the request Origin header; callers can spoof it
 * outside the browser. Local dev still uses Origin so localhost ports work.
 */
export function resolveCheckoutOrigin(headers: Headers): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallbackOrigin =
    process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_ORIGIN
      : headers.get("origin") ?? "";

  return (configuredOrigin || fallbackOrigin).replace(/\/+$/, "");
}
