import { describe, expect, it } from "vitest";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  jaduUrl,
  methodologyUrl,
  permitStudyUrl,
  rentUrl,
  stateCostUrl,
} from "@/lib/adu/content";
import { CITY_NAV_UPDATED, PLANNING_LINKS_UPDATED, buildAduSitemapXml, laterDate } from "./build-xml";

/** Map each `<loc>` to its `<lastmod>`. */
function lastmodByLoc(xml: string): Map<string, string> {
  return new Map(
    Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g), (match) => [match[1], match[2]]),
  );
}

describe("sitemap-adu.xml", () => {
  it("lists the hub, statewide cost guide, calculator, every jurisdiction page, and every cost page with as-of lastmod", () => {
    const xml = buildAduSitemapXml();
    const lastmod = lastmodByLoc(xml);
    expect(lastmod.get(hubUrl())).toBe(PLANNING_LINKS_UPDATED);
    expect(lastmod.get(stateCostUrl())).toBe(PLANNING_LINKS_UPDATED);
    expect(lastmod.get(calculatorUrl())).toBe(PLANNING_LINKS_UPDATED);
    expect(xml).toContain(`<loc>${methodologyUrl()}</loc>`);
    for (const city of ADU_CITIES) {
      // The as-of date, unless the guide's links changed later.
      expect(lastmod.get(cityUrl(city))).toBe(laterDate(city.asOf, CITY_NAV_UPDATED[city.slug] ?? city.asOf));
      expect(lastmod.get(cityUrl(city))! >= city.asOf).toBe(true);
    }
    expect(lastmod.get("https://lotfoundry.net/adu/ca/san-diego-county")).toBe("2026-11-05");
    for (const cost of ADU_COST_PAGES) {
      expect(lastmod.get(costPageUrl(cost))).toBe(laterDate(cost.asOf, PLANNING_LINKS_UPDATED));
    }
    expect(xml).toContain("<loc>https://lotfoundry.net/adu/ca/san-diego/cost</loc>");
    // Well-formed entries only: one <url> block per page, XML-escaped.
    expect(xml).toContain(`<loc>${rentUrl()}</loc>`);
    expect(xml).toContain(`<loc>${permitStudyUrl()}</loc>`);
    expect(xml).toContain(`<loc>${jaduUrl()}</loc>`);
    expect(xml.match(/<url>/g)?.length).toBe(ADU_CITIES.length + ADU_COST_PAGES.length + 7);
    expect(xml).not.toContain("& ");
  });
});
