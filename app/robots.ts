import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

const baseUrl = CANONICAL_ORIGIN;

/** Crawl rules: public marketing + legal; disallow member dashboards. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep Next.js assets, including fonts in /_next/static/media/,
      // crawlable so search engines can render the public pages accurately.
      disallow: ["/builder", "/settings", "/api/"],
    },
    // Core pages and the segmented ADU sitemap: Search Console reports
    // per-segment indexing, which is how the ADU program is measured.
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-adu.xml`],
  };
}
