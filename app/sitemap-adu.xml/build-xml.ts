import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  jaduUrl,
  METHODOLOGY_AS_OF,
  methodologyUrl,
  permitStudyUrl,
  rentUrl,
  stateCostUrl,
} from "@/lib/adu/content";
import { JADU_AS_OF } from "@/content/adu/ca/jadu";
import { CA_RENT_VERIFIED } from "@/content/adu/ca/rent";
import { SAN_DIEGO_PERMIT_STUDY } from "@/content/adu/ca/san-diego-permits";

/** The later of two ISO (`YYYY-MM-DD`) dates. */
export function laterDate(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * When pages' links changed without a new content review. A page's displayed
 * as-of date stays put; its sitemap date takes the later of the two. The
 * planning-links list gained the San José and Sacramento guides, and those two
 * guides gained links to the other counties' guides.
 */
export const PLANNING_LINKS_UPDATED = "2026-11-06";

/**
 * #385 added the official pre-approved plans section to every guide whose
 * jurisdiction has a verified plan catalog; it shipped 2026-11-08.
 */
export const PLANS_SECTION_ADDED = "2026-11-08";

/** Per-guide changes made without a new rules review, by slug. */
export const CITY_NAV_UPDATED: Record<string, string> = {
  "san-diego-county": PLANS_SECTION_ADDED,
  "san-diego": PLANS_SECTION_ADDED,
  carlsbad: "2026-11-11",
  "imperial-beach": PLANS_SECTION_ADDED,
  "la-mesa": PLANS_SECTION_ADDED,
  sacramento: PLANS_SECTION_ADDED,
  "san-jose": PLANNING_LINKS_UPDATED,
};

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
    // The hub, statewide cost guide and calculator last changed with the planning links.
    { loc: hubUrl(), lastmod: PLANNING_LINKS_UPDATED, changefreq: "monthly", priority: "0.8" },
    { loc: stateCostUrl(), lastmod: PLANNING_LINKS_UPDATED, changefreq: "monthly", priority: "0.8" },
    { loc: calculatorUrl(), lastmod: PLANNING_LINKS_UPDATED, changefreq: "monthly", priority: "0.8" },
    {
      loc: methodologyUrl(),
      lastmod: laterDate(METHODOLOGY_AS_OF, PLANNING_LINKS_UPDATED),
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: rentUrl(),
      lastmod: laterDate(CA_RENT_VERIFIED, PLANNING_LINKS_UPDATED),
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: jaduUrl(),
      lastmod: laterDate(JADU_AS_OF, PLANNING_LINKS_UPDATED),
      changefreq: "monthly",
      priority: "0.8",
    },
    {
      loc: permitStudyUrl(),
      lastmod: SAN_DIEGO_PERMIT_STUDY.generatedAt,
      changefreq: "monthly",
      priority: "0.7",
    },
    ...ADU_CITIES.map((city) => ({
      loc: cityUrl(city),
      lastmod: laterDate(city.asOf, CITY_NAV_UPDATED[city.slug] ?? city.asOf),
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...ADU_COST_PAGES.map((cost) => ({
      loc: costPageUrl(cost),
      // Every cost page renders the planning links.
      lastmod: laterDate(cost.asOf, PLANNING_LINKS_UPDATED),
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
