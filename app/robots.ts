import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://yardup-2026.web.app";

/** Crawl rules: public pages open; authenticated dashboards and APIs closed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/builder", "/settings", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
