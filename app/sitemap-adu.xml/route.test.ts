import { describe, expect, it } from "vitest";
import { ADU_CITIES, calculatorUrl, cityUrl, hubUrl } from "@/lib/adu/content";
import { buildAduSitemapXml } from "./build-xml";

describe("sitemap-adu.xml", () => {
  it("lists the hub, the cost calculator, and every jurisdiction page with as-of lastmod", () => {
    const xml = buildAduSitemapXml();
    expect(xml).toContain(`<loc>${hubUrl()}</loc>`);
    expect(xml).toContain(`<loc>${calculatorUrl()}</loc>`);
    for (const city of ADU_CITIES) {
      expect(xml).toContain(`<loc>${cityUrl(city)}</loc>`);
      expect(xml).toContain(`<lastmod>${city.asOf}</lastmod>`);
    }
    // Well-formed entries only: one <url> block per page, XML-escaped.
    expect(xml.match(/<url>/g)?.length).toBe(ADU_CITIES.length + 2);
    expect(xml).not.toContain("& ");
  });
});
