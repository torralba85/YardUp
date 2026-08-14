import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app";

/**
 * Only URLs we actually want shown in search.
 *
 * `/login`, `/signup`, and `/delete-account` are deliberately absent: they are
 * account-utility pages with nothing to rank for, and they carry a page-level
 * `noindex` as well — omitting them from the sitemap alone would not keep them
 * out of the index. `/delete-account` stays publicly reachable for store-policy
 * compliance; it is de-indexed, not hidden.
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
  const now = new Date();
  return paths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
