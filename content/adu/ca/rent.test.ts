import { describe, expect, it } from "vitest";
import {
  CA_COUNTY_RENTS,
  fmrAreas,
  planningRange,
  rentChangePercent,
  rentCsv,
} from "./rent";
import { RENT_SCENARIO_SPREADS } from "@/lib/adu/market-aggregate";

const bySlug = (slug: string) => CA_COUNTY_RENTS.find((row) => row.slug === slug)!;

describe("California county rent data", () => {
  it("covers the 12 counties LotFoundry resolves parcels in, once each", () => {
    expect(CA_COUNTY_RENTS).toHaveLength(12);
    expect(new Set(CA_COUNTY_RENTS.map((row) => row.slug)).size).toBe(12);
  });

  // Spot checks against HUD's FY2027 documentation pages, read 2026-10-28.
  it("matches HUD's published FY2027 and FY2026 figures", () => {
    expect(bySlug("san-diego").fy2027).toEqual({ studio: 2192, "1br": 2335, "2br": 2823 });
    expect(bySlug("san-diego").fy2026).toEqual({ studio: 2288, "1br": 2459, "2br": 3001 });
    expect(bySlug("los-angeles").fy2027).toEqual({ studio: 2151, "1br": 2402, "2br": 2964 });
    expect(bySlug("santa-clara").fy2026).toEqual({ studio: 2621, "1br": 2982, "2br": 3483 });
  });

  it("gives counties in the same HUD area identical figures", () => {
    for (const area of fmrAreas()) {
      const rows = CA_COUNTY_RENTS.filter((row) => row.fmrArea === area.fmrArea);
      for (const row of rows) {
        expect(row.fy2027).toEqual(area.row.fy2027);
        expect(row.fy2026).toEqual(area.row.fy2026);
      }
    }
    expect(fmrAreas()).toHaveLength(10);
  });

  it("orders studio below one-bedroom below two-bedroom in every row", () => {
    for (const row of CA_COUNTY_RENTS) {
      for (const year of [row.fy2027, row.fy2026]) {
        expect(year.studio).toBeLessThanOrEqual(year["1br"]);
        expect(year["1br"]).toBeLessThan(year["2br"]);
      }
    }
  });

  it("computes the year-over-year change to one decimal place", () => {
    expect(rentChangePercent(bySlug("san-diego"), "1br")).toBe(-5);
    expect(rentChangePercent(bySlug("los-angeles"), "1br")).toBe(3.2);
  });

  it("derives planning ranges from the Studio's rent spreads", () => {
    expect(planningRange(2335)).toEqual({
      conservative: 2335,
      market: Math.round(2335 * RENT_SCENARIO_SPREADS.market),
      optimistic: Math.round(2335 * RENT_SCENARIO_SPREADS.optimistic),
    });
  });

  it("exports one CSV row per county with quoted area names", () => {
    const lines = rentCsv().trim().split("\n");
    expect(lines[0]).toBe(
      "county,hud_fmr_area,fy2027_studio,fy2027_1br,fy2027_2br,fy2026_studio,fy2026_1br,fy2026_2br,change_1br_pct,planning_1br_conservative,planning_1br_market,planning_1br_optimistic",
    );
    expect(lines).toHaveLength(13);
    expect(lines).toContain(
      'San Diego County,"San Diego-Chula Vista-Carlsbad, CA MSA",2192,2335,2823,2288,2459,3001,-5,2335,2615,2919',
    );
  });
});
