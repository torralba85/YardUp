/**
 * Thin typed wrapper over Google Analytics 4 (`gtag.js`).
 *
 * The tag itself is injected by `components/analytics/GoogleAnalytics.tsx` and
 * only after the visitor accepts, so every helper here is a no-op until then.
 * Nothing in this module loads a script or writes a cookie on its own.
 */

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
 * Record a page view.
 *
 * The App Router does not emit a document load on client-side navigation, so
 * the tag is configured with `send_page_view: false` and every view — the
 * first one included — is sent from here. That keeps the initial view from
 * being counted twice.
 *
 * @param url - Path plus query, e.g. `/studio?address=...`.
 */
export function pageview(url: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  const id = getMeasurementId();
  if (!id) return;

  window.gtag("event", "page_view", {
    page_path: url,
    page_location: `${window.location.origin}${url}`,
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
  window.gtag("event", name, params);
}

/**
 * Delete the cookies GA4 sets on this host.
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
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid");

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
