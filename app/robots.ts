import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lotfoundry.net";

/** Crawl rules: public marketing + legal; disallow member dashboards. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/builder", "/settings", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
