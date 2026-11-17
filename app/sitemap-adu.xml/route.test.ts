import { PERMIT_AREAS } from "@/lib/adu/permit-areas";
import { describe, expect, it } from "vitest";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  eligibilityUrl,
  hubUrl,
  jaduUrl,
  methodologyUrl,
  permitStudyUrl,
  rentUrl,
  stateCostUrl,
} from "@/lib/adu/content";
import {
  calculatorLastModified,
  cityLastModified,
  costPageLastModified,
  eligibilityLastModified,
  hubLastModified,
  stateCostLastModified,
} from "@/lib/adu/dates";
import { CALIFORNIA_COST_GUIDE_AS_OF } from "@/components/adu/CaliforniaAduCostGuide";
import { guidePlanCatalog } from "@/lib/preapproved-plans";
import {
  PLANS_SECTION_ADDED,
  buildAduSitemapXml,
} from "./build-xml";

/** Map each `<loc>` to its `<lastmod>`. */
function lastmodByLoc(xml: string): Map<string, string> {
  return new Map(
    Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g), (match) => [match[1], match[2]]),
  );
}

describe("sitemap-adu.xml", () => {
  it("lists the hub, eligibility guide, statewide cost guide, calculator, every jurisdiction page, and every cost page with as-of lastmod", () => {
    const xml = buildAduSitemapXml();
    const lastmod = lastmodByLoc(xml);
    expect(lastmod.get(hubUrl())).toBe(hubLastModified());
    expect(lastmod.get(eligibilityUrl())).toBe(eligibilityLastModified());
    expect(lastmod.get(stateCostUrl())).toBe(stateCostLastModified(CALIFORNIA_COST_GUIDE_AS_OF));
    expect(lastmod.get(calculatorUrl())).toBe(calculatorLastModified());
    expect(xml).toContain(`<loc>${methodologyUrl()}</loc>`);
    for (const city of ADU_CITIES) {
      expect(lastmod.get(cityUrl(city))).toBe(cityLastModified(city.slug, city.asOf));
      expect(lastmod.get(cityUrl(city))! >= city.asOf).toBe(true);
    }
    expect(lastmod.get("https://lotfoundry.net/adu/ca/san-diego-county")).toBe(cityLastModified("san-diego-county", "2026-10-24"));
    for (const cost of ADU_COST_PAGES) {
      expect(lastmod.get(costPageUrl(cost))).toBe(costPageLastModified(cost.asOf));
    }
    expect(xml).toContain("<loc>https://lotfoundry.net/adu/ca/san-diego/cost</loc>");
    // Well-formed entries only: one <url> block per page, XML-escaped.
    expect(xml).toContain(`<loc>${rentUrl()}</loc>`);
    expect(xml).toContain(`<loc>${permitStudyUrl()}</loc>`);
    expect(xml).toContain(`<loc>${jaduUrl()}</loc>`);
    expect(xml.match(/<url>/g)?.length).toBe(ADU_CITIES.length + ADU_COST_PAGES.length + PERMIT_AREAS.length + 8);
    expect(xml).not.toContain("& ");
  });

  it("dates every guide that shows official plans no earlier than the day that section shipped", () => {
    const lastmod = lastmodByLoc(buildAduSitemapXml());
    const withPlans = ADU_CITIES.filter((city) => guidePlanCatalog(city.state, city.slug));
    expect(withPlans.length).toBeGreaterThan(0);
    for (const city of withPlans) {
      expect(lastmod.get(cityUrl(city))! >= PLANS_SECTION_ADDED, `${city.slug} sitemap date`).toBe(true);
    }
  });
});
