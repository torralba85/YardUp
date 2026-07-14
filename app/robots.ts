import type { MetadataRoute } from "next";

/** Canonical site origin, mirroring the `metadataBase` fallback in `app/layout.tsx`. */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app";

/**
 * `robots.txt` route. Allows crawling of the public product and marketing
 * surfaces while keeping server API routes out of the index, and points
 * crawlers at the sitemap. Next.js serves this at `/robots.txt`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
