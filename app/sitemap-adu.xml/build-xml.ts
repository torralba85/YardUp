import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  stateCostUrl,
} from "@/lib/adu/content";

/** XML-escape a sitemap value. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render the segmented ADU sitemap body: the California hub and statewide
 * cost guide, the calculator, one URL per jurisdiction page, and one per
 * jurisdiction cost page, with `lastmod` wired to each page's as-of date.
 * Kept out of `route.ts` because route modules may only export HTTP
 * handlers and route config.
 */
export function buildAduSitemapXml(): string {
  const urls = [
    { loc: hubUrl(), lastmod: "2026-09-24", changefreq: "monthly", priority: "0.8" },
    { loc: stateCostUrl(), lastmod: "2026-10-07", changefreq: "monthly", priority: "0.8" },
    { loc: calculatorUrl(), lastmod: "2026-09-24", changefreq: "monthly", priority: "0.8" },
    ...ADU_CITIES.map((city) => ({
      loc: cityUrl(city),
      lastmod: city.asOf,
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...ADU_COST_PAGES.map((cost) => ({
      loc: costPageUrl(cost),
      lastmod: cost.asOf,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];
  const entries = urls
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
