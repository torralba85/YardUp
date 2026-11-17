import { PERMIT_AREAS, permitAreaUrl, permitAreaLastModified } from "@/lib/adu/permit-areas";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  eligibilityUrl,
  hubUrl,
  jaduUrl,
  METHODOLOGY_AS_OF,
  methodologyUrl,
  permitStudyUrl,
  rentUrl,
  stateCostUrl,
} from "@/lib/adu/content";
import {
  calculatorLastModified,
  cityLastModified,
  CITY_NAV_UPDATED,
  costPageLastModified,
  eligibilityLastModified,
  hubLastModified,
  jaduLastModified,
  laterDate,
  methodologyLastModified,
  permitStudyLastModified,
  PLANNING_LINKS_UPDATED,
  PLANS_SECTION_ADDED,
  rentLastModified,
  stateCostLastModified,
} from "@/lib/adu/dates";
import { CALIFORNIA_COST_GUIDE_AS_OF } from "@/components/adu/CaliforniaAduCostGuide";
import { SAN_DIEGO_PERMIT_STUDY } from "@/content/adu/ca/san-diego-permits";

export { CITY_NAV_UPDATED, laterDate, PLANNING_LINKS_UPDATED, PLANS_SECTION_ADDED };

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
    { loc: hubUrl(), lastmod: hubLastModified(), changefreq: "monthly", priority: "0.8" },
    { loc: eligibilityUrl(), lastmod: eligibilityLastModified(), changefreq: "monthly", priority: "0.8" },
    { loc: stateCostUrl(), lastmod: stateCostLastModified(CALIFORNIA_COST_GUIDE_AS_OF), changefreq: "monthly", priority: "0.8" },
    { loc: calculatorUrl(), lastmod: calculatorLastModified(), changefreq: "monthly", priority: "0.8" },
    {
      loc: methodologyUrl(),
      lastmod: methodologyLastModified(METHODOLOGY_AS_OF),
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: rentUrl(),
      lastmod: rentLastModified(),
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: jaduUrl(),
      lastmod: jaduLastModified(),
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: permitStudyUrl(),
      lastmod: permitStudyLastModified(SAN_DIEGO_PERMIT_STUDY.generatedAt),
      changefreq: "monthly",
      priority: "0.7",
    },
    ...PERMIT_AREAS.map((area) => ({ loc: permitAreaUrl(area), lastmod: permitAreaLastModified(), changefreq: "monthly", priority: "0.6" })),
    ...ADU_CITIES.map((city) => ({
      loc: cityUrl(city),
      lastmod: cityLastModified(city.slug, city.asOf),
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...ADU_COST_PAGES.map((cost) => ({
      loc: costPageUrl(cost),
      lastmod: costPageLastModified(cost.asOf),
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
