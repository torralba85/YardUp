import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lotfoundry.net";

/** Crawl rules: public marketing + legal; disallow member dashboards. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // `/_next/static/media/` keeps crawled `.woff2`/media asset URLs out of
      // the page index; CSS/JS under the other `/_next/static/` paths stay
      // crawlable so Google can render pages.
      disallow: ["/builder", "/settings", "/api/", "/_next/static/media/"],
    },
    // Core pages and the segmented ADU sitemap: Search Console reports
    // per-segment indexing, which is how the ADU program is measured.
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-adu.xml`],
  };
}
