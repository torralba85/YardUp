import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

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
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/studio",
    "/about",
    "/help",
    "/feedback",
    "/privacy",
    "/terms",
  ];
  return paths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "/" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
