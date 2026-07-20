import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yardup-2026.web.app";

/** Crawl rules: public marketing + legal; disallow member dashboards. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/builder", "/settings", "/api/", "/type-samples"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
