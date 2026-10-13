/**
 * Thin typed wrapper over Google Analytics 4 (`gtag.js`).
 *
 * The tag itself is injected by `components/analytics/GoogleAnalytics.tsx` and
 * only after the visitor accepts, so every helper here is a no-op until then.
 * Nothing in this module loads a script or writes a cookie on its own.
 */

import { isAnalyticsSuppressed, readConsent } from "./consent";
import { GOOGLE_ADS_ID } from "./adsConversion";

/** Arguments accepted by the global `gtag` command queue. */
type GtagArgs =
  | ["js", Date]
  | ["config", string, Record<string, unknown>?]
  | ["event", string, Record<string, unknown>?]
  | ["consent", "default" | "update", Record<string, string>];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

/**
 * The GA4 measurement ID for this build, or `""` when analytics is not set up.
 *
 * Read through a function rather than a module constant so tests can vary it;
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time either way.
 *
 * @returns The trimmed `G-XXXXXXXXXX` ID, or `""`.
 */
export function getMeasurementId(): string {
  return (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
}

/**
 * Whether this build has a usable GA4 measurement ID.
 *
 * Guards both the tag and the consent banner: with no ID there is nothing to
 * consent to, so asking would be a dark pattern for a decision that changes
 * nothing.
 *
 * @returns `true` when a well-formed `G-` measurement ID is configured.
 */
export function isAnalyticsConfigured(): boolean {
  return /^G-[A-Z0-9]+$/i.test(getMeasurementId());
}

/**
 * Strips search queries (`?q=...`) and hash fragments (`#...`) from a path or URL,
 * returning only the clean pathname. Prevents addresses or query parameters from
 * ever reaching analytics.
 *
 * @param url - Path or URL, e.g. `/studio?q=123+Main+St` or `https://.../studio#top`.
 * @returns Sanitized path, e.g. `/studio`.
 */
export function sanitizePath(url: string): string {
  if (!url) return "/";
  try {
    const dummyOrigin = "https://lotfoundry.net";
    const parsed = new URL(url, dummyOrigin);
    return parsed.pathname || "/";
  } catch {
    return url.split("?")[0].split("#")[0] || "/";
  }
}

/**
 * Strips search queries and hash fragments from a referrer URL.
 *
 * @param referrer - Full referrer URL.
 * @returns Origin plus clean pathname without query or hash.
 */
export function sanitizeReferrer(referrer: string): string {
  if (!referrer) return "";
  try {
    const parsed = new URL(referrer);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return referrer.split("?")[0].split("#")[0];
  }
}

/**
 * Explicitly disable GA4 tracking on `window`, purge analytics cookies,
 * and mark opt-out state.
 */
export function disableAnalytics(): void {
  if (typeof window === "undefined") return;
  const id = getMeasurementId();
  if (id) {
    (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = true;
  }
  (window as unknown as Record<string, boolean>)[`ga-disable-${GOOGLE_ADS_ID}`] = true;
  clearAnalyticsCookies();
  try {
    window.sessionStorage.removeItem("lf:analytics-entry-source");
    window.sessionStorage.removeItem("lf:analytics-pending-lead-unlock");
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Re-enable GA4 tracking on `window` when consent is granted.
 */
export function enableAnalytics(): void {
  if (typeof window === "undefined") return;
  const id = getMeasurementId();
  if (id) {
    delete (window as unknown as Record<string, boolean>)[`ga-disable-${id}`];
  }
  delete (window as unknown as Record<string, boolean>)[`ga-disable-${GOOGLE_ADS_ID}`];
}

/**
 * Record a page view.
 *
 * The App Router does not emit a document load on client-side navigation, so
 * the tag is configured with `send_page_view: false` and every view — the
 * first one included — is sent from here. That keeps the initial view from
 * being counted twice.
 *
 * Enforces:
 * - Current configured and granted consent.
 * - Sanitized path and location: query parameters and fragments are stripped
 *   so property addresses never reach GA4.
 * - Sanitized referrer: queries are stripped.
 *
 * @param url - Path, e.g. `/studio`.
 */
export function pageview(url: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isAnalyticsSuppressed()) return;
  if (!isAnalyticsConfigured() || readConsent() !== "granted") return;
  const id = getMeasurementId();
  if (!id) return;

  const sanitized = sanitizePath(url);
  const location = `${window.location.origin}${sanitized}`;
  const referrer = sanitizeReferrer(document.referrer);

  window.gtag("event", "page_view", {
    page_path: sanitized,
    page_location: location,
    page_referrer: referrer,
    page_title: document.title,
    send_to: id,
  });
}

/**
 * Record a custom event.
 *
 * Silently does nothing when analytics is unconfigured or consent has not been
 * granted, so call sites never need to guard.
 *
 * @param name - GA4 event name (snake_case, max 40 chars).
 * @param params - Event parameters. Never pass addresses, emails, or any other
 * personal data: GA4 forbids PII and `app/privacy/page.tsx` promises we do not
 * send it.
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  if (isAnalyticsSuppressed()) return;
  if (!isAnalyticsConfigured() || readConsent() !== "granted") return;
  const id = getMeasurementId();
  if (!id) return;

  const sanitized = sanitizePath(window.location.href);
  const safeParams = { ...params };
  delete safeParams.page_location;
  delete safeParams.page_path;
  delete safeParams.page_referrer;
  delete safeParams.send_to;

  const referrer = sanitizeReferrer(document.referrer);
  window.gtag("event", name, {
    ...safeParams,
    page_path: sanitized,
    page_location: `${window.location.origin}${sanitized}`,
    ...(referrer ? { page_referrer: referrer } : {}),
    send_to: id,
  });
}

/**
 * Delete first-party GA4 and Google Ads measurement cookies on this host.
 *
 * Unmounting the tag stops new collection, but the `_ga` client-ID cookie
 * survives on its own two-year expiry — so withdrawing consent would still
 * leave the visitor identifiable to a later re-grant. Expiring them here makes
 * "Decline" mean what the privacy page says it means.
 *
 * GA writes `_ga` and `_ga_<CONTAINER>` at the registrable domain (a leading
 * dot), so each name is expired against both the exact host and the parent
 * domain; a `document.cookie` delete only lands when domain and path match the
 * original write.
 */
export function clearAnalyticsCookies(): void {
  if (typeof document === "undefined") return;

  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim() ?? "")
    .filter((name) =>
      name === "_ga" || name.startsWith("_ga_") || name === "_gid" ||
      name.startsWith("_gcl_") || name.startsWith("_gac_")
    );

  const { hostname } = window.location;
  // e.g. "lotfoundry.net" -> ["lotfoundry.net", ".lotfoundry.net"]; on
  // "www.lotfoundry.net" the parent domain is also covered. Deduped as an
  // array rather than a Set because tsconfig targets ES5, where iterating a
  // Set needs downlevelIteration.
  const parts = hostname.split(".");
  const candidates = [hostname, `.${hostname}`];
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    candidates.push(parent, `.${parent}`);
  }
  const domains = candidates.filter(
    (domain, index) => candidates.indexOf(domain) === index,
  );

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
  }
}
