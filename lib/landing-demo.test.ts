import { describe, expect, it } from "vitest";
import { aduSetbacks } from "./adu-setbacks";
import { cityMarketAggregate, estimateAdu } from "./adu/market-aggregate";
import { defaultAduConfig, getParcelById, parcelPresets } from "./feasibility";
import { landingDemos, landingScenarios } from "./landing-demo";

describe("San Diego demo", () => {
  it("appends the approved illustrative lot and preserves the Seattle fallback", () => {
    expect(parcelPresets.map((parcel) => parcel.id)).toEqual(["oak-street", "corner-lot", "compact-lot", "coyote-brush"]);
    expect(getParcelById("unknown")).toBe(parcelPresets[0]);
    expect(parcelPresets[3]).toEqual({
      id: "coyote-brush",
      name: "San Diego RS-1-7 Lot",
      address: "1234 Coyote Brush Court",
      city: "San Diego, CA 92117",
      lotArea: 5000,
      lotWidth: 50,
      lotLength: 100,
      existingHouseSqft: 1400,
      maxLotCoveragePercent: 60,
      regulationsEstimated: true,
      setbacks: { front: 15, rear: 13, side: 4 },
      expectedRent: { conservative: 2459, market: 2754, optimistic: 3074 },
      marketData: {
        rentByBedroom: { studio: 2090, "1br": 2459, "2br": 3123 },
        costMultiplier: 1,
        source: "hud-county",
        area: "San Diego County, CA",
        asOf: "HUD FY2026 FMR (effective 2026-05-21; seed extract)",
        sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
        confidence: "medium",
      },
    });
    expect(aduSetbacks(parcelPresets[3], defaultAduConfig)).toEqual({ front: 15, rear: 4, side: 4, rule: "san-diego-unchecked" });
  });

  it("matches every HUD-derived one-bedroom rent band at 600 sq ft", () => {
    const anchor = cityMarketAggregate("san-diego")!;
    expect(anchor.rows.find((row) => row.size === 600)).toMatchObject({ bedroom: "1br", monthlyRent: 2459 });
    for (const rentScenario of ["conservative", "market", "optimistic"] as const) {
      const row = estimateAdu({ county: anchor.slug, size: 600, finish: "cedar", rentScenario })!;
      expect(parcelPresets[3].expectedRent[rentScenario]).toBe(row.monthlyRent);
    }
  });

  it("uses San Diego rent while the homepage keeps Seattle", () => {
    expect(landingScenarios("san-diego").map(({ rent }) => rent)).toEqual([2459, 2754, 3074]);
    expect(landingScenarios()).toEqual(landingScenarios("seattle"));
    expect(landingDemos["san-diego"]).toMatchObject({ city: "San Diego", region: "CA", parcelId: "coyote-brush", name: "Coyote Brush Court" });
  });
});
