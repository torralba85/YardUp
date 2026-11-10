import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

const baseUrl = CANONICAL_ORIGIN;

/** Crawl rules: public pages crawlable, API routes disallowed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep Next.js assets, including fonts in /_next/static/media/,
      // crawlable so search engines can render the public pages accurately.
      // Member pages such as /builder and /settings stay crawlable on purpose:
      // they carry `noindex`, and a crawler blocked here never reads it, so a
      // linked URL could still be indexed without its content.
      disallow: ["/api/"],
    },
    // Core pages and the segmented ADU sitemap: Search Console reports
    // per-segment indexing, which is how the ADU program is measured.
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-adu.xml`],
  };
}
