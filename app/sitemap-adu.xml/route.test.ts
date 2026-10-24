import { describe, expect, it } from "vitest";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  calculatorUrl,
  cityUrl,
  costPageUrl,
  hubUrl,
  methodologyUrl,
  stateCostUrl,
} from "@/lib/adu/content";
import { buildAduSitemapXml } from "./build-xml";

describe("sitemap-adu.xml", () => {
  it("lists the hub, statewide cost guide, calculator, every jurisdiction page, and every cost page with as-of lastmod", () => {
    const xml = buildAduSitemapXml();
    expect(xml).toContain(`<loc>${hubUrl()}</loc>`);
    expect(xml).toContain(`<loc>${stateCostUrl()}</loc>`);
    expect(xml).toContain("<lastmod>2026-10-07</lastmod>");
    expect(xml).toContain(`<loc>${calculatorUrl()}</loc>`);
    expect(xml).toContain(`<loc>${methodologyUrl()}</loc>`);
    for (const city of ADU_CITIES) {
      expect(xml).toContain(`<loc>${cityUrl(city)}</loc>`);
      expect(xml).toContain(`<lastmod>${city.asOf}</lastmod>`);
    }
    for (const cost of ADU_COST_PAGES) {
      expect(xml).toContain(`<loc>${costPageUrl(cost)}</loc>`);
    }
    expect(xml).toContain("<loc>https://lotfoundry.net/adu/ca/san-diego/cost</loc>");
    // Well-formed entries only: one <url> block per page, XML-escaped.
    expect(xml.match(/<url>/g)?.length).toBe(ADU_CITIES.length + ADU_COST_PAGES.length + 4);
    expect(xml).not.toContain("& ");
  });
});
