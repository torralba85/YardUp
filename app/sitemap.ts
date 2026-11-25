import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { CURRENT_LEGAL_CONSENT } from "@/lib/legal-consent";
import { laterDate, SEARCH_CONSOLE_AUDIT_UPDATED } from "@/lib/adu/dates";

const baseUrl = CANONICAL_ORIGIN;

/**
 * Only URLs we actually want shown in search.
 *
 * `/login`, `/signup`, and `/delete-account` are deliberately absent: they are
 * account-utility pages with nothing to rank for, and they carry a page-level
 * `noindex` as well — omitting them from the sitemap alone would not keep them
 * out of the index. `/delete-account` stays publicly reachable for store-policy
 * compliance; it is de-indexed, not hidden.
 *
 * The demo landings (`/seattle`, `/portland`, `/austin`, `/san-diego`) are
 * absent for the same reason: they repeat the homepage with a different sample
 * lot and carry `noindex` (`cityLandingMetadata`).
 *
 * `lastmod` is the date the page's content last changed, never the build time:
 * Bing and Google stop trusting a sitemap whose dates move on every deploy.
 * Bump a page's date when you change what it shows. The legal pages follow
 * their published versions, or a later edit that kept the version.
 */
const lastModified: Record<string, string> = {
  "/": SEARCH_CONSOLE_AUDIT_UPDATED,
  "/can-i-build-a-backyard-home": SEARCH_CONSOLE_AUDIT_UPDATED,
  "/studio": "2026-11-20",
  "/about": "2026-11-21",
  "/help": "2026-11-21",
  "/feedback": "2026-11-16",
  // #362 added processors to both policies on 2026-11-03 without a new
  // version, /privacy was retitled on 2026-11-06, /terms added pre-approved
  // municipal plan disclaimers on 2026-11-06 and was retitled on 2026-11-16.
  "/privacy": laterDate(CURRENT_LEGAL_CONSENT.privacyVersion, "2026-11-06"),
  "/terms": laterDate(CURRENT_LEGAL_CONSENT.termsVersion, "2026-11-16"),
};

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(lastModified).map(([path, date]) => ({
    url: `${baseUrl}${path === "/" ? "/" : path}`,
    lastModified: date,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
