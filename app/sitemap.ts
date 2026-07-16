import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app";

/** Public routes only — no authenticated dashboards or APIs. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/studio",
    "/about",
    "/help",
    "/feedback",
    "/privacy",
    "/terms",
    "/delete-account",
    "/login",
    "/signup",
  ];
  const now = new Date();
  return paths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
