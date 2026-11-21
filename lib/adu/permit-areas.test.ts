import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  notFound: () => {
    throw new Error("notFound");
  },
}));
import { SAN_DIEGO_PERMIT_STUDY as study } from "@/content/adu/ca/san-diego-permits";
import type { PermitArea } from "@/content/adu/ca/san-diego-permits";
import {
  PERMIT_AREAS, findPermitArea, permitAreaComparisons, permitAreaDescription, permitAreaLastModified,
  permitAreaSlug, permitAreaTitle, permitAreaUrl, similarPermitAreas,
} from "./permit-areas";
import { buildAduSitemapXml } from "@/app/sitemap-adu.xml/build-xml";
import { buildLlmsTxt } from "@/app/llms.txt/build-text";
import { SITE_NAME } from "@/lib/site-identity";
import PermitAreaPage, { generateMetadata, generateStaticParams } from "@/app/adu/ca/san-diego/permits/[area]/page";
import { generateStaticParams as generateOgParams } from "@/app/adu/ca/san-diego/permits/[area]/opengraph-image";

/** A published area with its yearly units replaced, for phrasing branches. */
function withYears(unitsByYear: Record<string, number>, jaduUnits: number): PermitArea {
  const units = Object.values(unitsByYear).reduce((a, b) => a + b, 0);
  return { ...PERMIT_AREAS[0], name: "Test Area", unitsByYear, units, jaduUnits };
}

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

  it("fits titles and descriptions to search display limits", async () => {
    for (const area of PERMIT_AREAS) {
      const title = permitAreaTitle(area);
      const description = permitAreaDescription(area);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title).toContain(`${area.name} ADU Permits`);
      expect(title.match(/San Diego/g)?.length ?? 0).toBeLessThanOrEqual(1 + (area.name.match(/San Diego/g)?.length ?? 0));
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(description).toContain(area.units.toLocaleString("en-US"));
      const metadata = await generateMetadata({ params: Promise.resolve({ area: permitAreaSlug(area) }) });
      expect(metadata.title).toBe(title);
      expect(metadata.description).toBe(description);
    }
    const northPark = findPermitArea("north-park")!;
    expect(permitAreaTitle(northPark)).toBe(`North Park ADU Permits: ${northPark.units} Units Since 2023 | San Diego`);
    expect(permitAreaTitle(findPermitArea("southeastern-san-diego")!)).not.toContain("| San Diego");
  });

  it("phrases each comparison from the area's own numbers", () => {
    const rising = permitAreaComparisons(withYears({ 2023: 50, 2024: 100, 2025: 150, 2026: 200 }, 0));
    expect(rising).toHaveLength(4);
    expect(rising[0]).toBe("Permitted units in Test Area rose 50% from 2024 to 2025 (100 to 150), while the citywide total fell 3%.");
    expect(rising[1]).toMatch(/^So far in 2026 \(through [A-Z][a-z]{2} \d{1,2}\), permits have added 200 units, already more than its 2025 total of 150; citywide, 2026 stands at \d+% of 2025\.$/);
    expect(rising[3]).toMatch(/^No junior ADUs were permitted here/);
    const falling = permitAreaComparisons(withYears({ 2023: 50, 2024: 100, 2025: 60, 2026: 30 }, 24));
    expect(falling[0]).toContain("fell 40% from 2024 to 2025 (100 to 60)");
    expect(falling[1]).toContain("30 units, 50% of its 2025 total");
    expect(falling[2]).toMatch(/units are 2\.\d times the median planning area's \d+\.$/);
    expect(falling[3]).toBe("Junior ADUs make up 10.0% of its units, above the citywide 7.2%.");
    expect(permitAreaComparisons(withYears({ 2023: 20, 2024: 30, 2025: 30, 2026: 1 }, 3))[0]).toContain("held steady");
    for (const area of PERMIT_AREAS) expect(permitAreaComparisons(area).every((sentence) => sentence.endsWith("."))).toBe(true);
  });

  it("cross-links every area to the published areas nearest in total units", () => {
    const inbound = new Map<string, number>();
    for (const area of PERMIT_AREAS) {
      const similar = similarPermitAreas(area);
      expect(similar).toHaveLength(4);
      expect(similar.map((other) => other.name)).not.toContain(area.name);
      for (const other of similar) {
        expect(findPermitArea(permitAreaSlug(other))).toBe(other);
        inbound.set(other.name, (inbound.get(other.name) ?? 0) + 1);
      }
    }
    expect(similarPermitAreas(PERMIT_AREAS[0])).toEqual(PERMIT_AREAS.slice(1, 5));
    expect(similarPermitAreas(PERMIT_AREAS[10])).toEqual([...PERMIT_AREAS.slice(8, 10), ...PERMIT_AREAS.slice(11, 13)]);
    expect(PERMIT_AREAS.every((area) => (inbound.get(area.name) ?? 0) >= 2)).toBe(true);
  });

  it("gives every area its own share card, og:site_name, 5-level breadcrumbs, and a lastmod covering the update", async () => {
    expect(generateOgParams()).toEqual(generateStaticParams());
    expect(permitAreaLastModified()).toBe("2026-11-21");
    expect(buildAduSitemapXml()).toContain(`<loc>${permitAreaUrl(PERMIT_AREAS[0])}</loc>\n    <lastmod>2026-11-21</lastmod>`);
    for (const area of PERMIT_AREAS) {
      const metadata = await generateMetadata({ params: Promise.resolve({ area: permitAreaSlug(area) }) });
      expect(metadata.openGraph?.siteName).toBe(SITE_NAME);
    }
    const html = renderToStaticMarkup(await PermitAreaPage({ params: Promise.resolve({ area: "north-park" }) }));
    const scripts = Array.from(html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g), (m) => JSON.parse(m[1]));
    const bc = scripts.find((s) => s["@type"] === "BreadcrumbList");
    expect(bc?.itemListElement.map((item: { position: number; item: string }) => [item.position, item.item])).toEqual([
      [1, "https://lotfoundry.net/"],
      [2, "https://lotfoundry.net/adu/ca"],
      [3, "https://lotfoundry.net/adu/ca/san-diego"],
      [4, "https://lotfoundry.net/adu/ca/san-diego/permits"],
      [5, "https://lotfoundry.net/adu/ca/san-diego/permits/north-park"],
    ]);
  });
});
