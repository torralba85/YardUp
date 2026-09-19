import { buildAduSitemapXml } from "./build-xml";

/**
 * Segmented ADU sitemap (`/sitemap-adu.xml`), separate from the core
 * `/sitemap.xml` so Search Console reports per-segment indexing data for
 * the program. Both files are listed in `app/robots.ts`.
 */
export function GET(): Response {
  return new Response(buildAduSitemapXml(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
