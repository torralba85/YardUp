import { CA_RENT_VERIFIED } from "@/content/adu/ca/rent";
import { JADU_AS_OF } from "@/content/adu/ca/jadu";
import { STATE_BASELINE_AS_OF } from "@/content/adu/state-baseline";

/** The later of two ISO (`YYYY-MM-DD`) dates. */
export function laterDate(a: string, b: string): string {
  return a > b ? a : b;
}

export const PLANNING_LINKS_UPDATED = "2026-11-06";
export const PLANS_SECTION_ADDED = "2026-11-08";
export const AUDIT_GUIDES_UPDATED = "2026-11-13";
export const SEO_AUDIT_20261121_UPDATED = "2026-11-21";
export const SEARCH_CONSOLE_AUDIT_UPDATED = "2026-11-25";
export const ELIGIBILITY_GUIDE_PUBLISHED = "2026-11-13";
export const ELIGIBILITY_GUIDE_AS_OF = "2026-11-13";

/** Per-guide changes made without a new local ordinance review, by slug. */
export const CITY_NAV_UPDATED: Record<string, string> = {
  "san-diego-county": SEARCH_CONSOLE_AUDIT_UPDATED,
  "san-diego": "2026-11-26",
  carlsbad: SEARCH_CONSOLE_AUDIT_UPDATED,
  "chula-vista": AUDIT_GUIDES_UPDATED,
  "el-cajon": AUDIT_GUIDES_UPDATED,
  encinitas: AUDIT_GUIDES_UPDATED,
  escondido: AUDIT_GUIDES_UPDATED,
  "imperial-beach": AUDIT_GUIDES_UPDATED,
  "la-mesa": SEARCH_CONSOLE_AUDIT_UPDATED,
  oceanside: AUDIT_GUIDES_UPDATED,
  sacramento: AUDIT_GUIDES_UPDATED,
  "san-jose": AUDIT_GUIDES_UPDATED,
  "san-marcos": AUDIT_GUIDES_UPDATED,
  vista: AUDIT_GUIDES_UPDATED,
};

/** Single source of truth for a city guide's Article.dateModified and sitemap lastmod. */
export function cityLastModified(slug: string, asOf: string): string {
  return laterDate(asOf, CITY_NAV_UPDATED[slug] ?? STATE_BASELINE_AS_OF);
}

/** Single source of truth for a cost guide's Article.dateModified and sitemap lastmod. */
export function costPageLastModified(asOf: string): string {
  return laterDate(asOf, SEARCH_CONSOLE_AUDIT_UPDATED);
}

export function stateCostLastModified(asOf = "2026-10-07"): string {
  return laterDate(asOf, SEARCH_CONSOLE_AUDIT_UPDATED);
}

export function hubLastModified(): string {
  return SEO_AUDIT_20261121_UPDATED;
}

export function calculatorLastModified(): string {
  return SEARCH_CONSOLE_AUDIT_UPDATED;
}

export function eligibilityLastModified(): string {
  return ELIGIBILITY_GUIDE_AS_OF;
}

export function jaduLastModified(): string {
  return laterDate(JADU_AS_OF, AUDIT_GUIDES_UPDATED);
}

export function rentLastModified(): string {
  return laterDate(CA_RENT_VERIFIED, PLANNING_LINKS_UPDATED);
}

export function methodologyLastModified(asOf = "2026-10-24"): string {
  return laterDate(asOf, PLANNING_LINKS_UPDATED);
}

export function permitStudyLastModified(generatedAt: string): string {
  return laterDate(generatedAt, "2026-11-16");
}
