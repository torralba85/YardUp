import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yardup-2026.web.app";

/**
 * Public routes only — authenticated dashboards (`/builder`, `/settings`) and
 * API routes are deliberately excluded (see `app/robots.ts`).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/studio", priority: 0.9 },
    { path: "/about", priority: 0.6 },
    { path: "/help", priority: 0.6 },
    { path: "/feedback", priority: 0.4 },
    { path: "/login", priority: 0.3 },
    { path: "/signup", priority: 0.3 },
    { path: "/terms", priority: 0.2 },
    { path: "/privacy", priority: 0.2 },
    { path: "/delete-account", priority: 0.2 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE_URL}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority,
  }));
}
