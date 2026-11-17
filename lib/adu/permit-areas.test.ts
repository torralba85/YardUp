import { describe, expect, it } from "vitest";
import { SAN_DIEGO_PERMIT_STUDY as study } from "@/content/adu/ca/san-diego-permits";
import { PERMIT_AREAS, findPermitArea, permitAreaSlug, permitAreaUrl } from "./permit-areas";
import { buildAduSitemapXml } from "@/app/sitemap-adu.xml/build-xml";
import { buildLlmsTxt } from "@/app/llms.txt/build-text";
import { generateMetadata, generateStaticParams } from "@/app/adu/ca/san-diego/permits/[area]/page";

describe("neighborhood permit pages", () => {
  it("publishes only areas with enough approvals and unique stable slugs", () => {
    expect(PERMIT_AREAS).toHaveLength(23);
    expect(new Set(PERMIT_AREAS.map(permitAreaSlug)).size).toBe(PERMIT_AREAS.length);
    expect(generateStaticParams()).toHaveLength(PERMIT_AREAS.length);
    for (const area of study.byArea) {
      expect(Boolean(findPermitArea(permitAreaSlug(area)))).toBe(area.approvals >= 50);
      expect(Object.values(area.unitsByYear).reduce((a, b) => a + b, 0)).toBe(area.units);
    }
    expect(findPermitArea("unknown-area")).toBeUndefined();
  });

  it("keeps each canonical, search listing and assistant listing in sync", async () => {
    const sitemap = buildAduSitemapXml();
    const llms = buildLlmsTxt();
    const titles = new Set();
    for (const area of PERMIT_AREAS) {
      const metadata = await generateMetadata({ params: Promise.resolve({ area: permitAreaSlug(area) }) });
      expect(metadata.alternates?.canonical).toBe(permitAreaUrl(area));
      expect(sitemap).toContain(`<loc>${permitAreaUrl(area)}</loc>`);
      expect(llms).toContain(`](${permitAreaUrl(area)})`);
      titles.add(metadata.title);
    }
    expect(titles.size).toBe(PERMIT_AREAS.length);
  });
});
