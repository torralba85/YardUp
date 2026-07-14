import type { MetadataRoute } from "next";

/** Canonical site origin, mirroring the `metadataBase` fallback in `app/layout.tsx`. */
const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app"
).replace(/\/+$/, "");

/**
 * Public, indexable routes for the sitemap. Auth-utility pages
 * (`/forgot-password`) and app-only surfaces behind sign-in are intentionally
 * excluded. `changeFrequency`/`priority` are advisory hints for crawlers.
 */
const ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/studio", changeFrequency: "weekly", priority: 0.9 },
  { path: "/login", changeFrequency: "monthly", priority: 0.4 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * `sitemap.xml` route. Lists the public routes crawlers should discover.
 * Next.js serves this at `/sitemap.xml`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
