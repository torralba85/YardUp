/**
 * Canonical site origin for absolute URLs in crawler/SEO metadata
 * (`metadataBase`, robots.txt, sitemap.xml). Configured via
 * `NEXT_PUBLIC_APP_URL`; the Firebase Hosting default applies only when that
 * variable is unset. Trailing slashes are stripped so paths can be appended
 * directly. Deliberately never derived from request headers — see
 * `lib/server/checkout-origin.ts` for why Origin is untrusted.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app"
).replace(/\/+$/, "");
