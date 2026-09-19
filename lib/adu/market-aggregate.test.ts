import { describe, expect, it } from "vitest";
import {
  CITY_MARKET_SIZES,
  cityMarketAggregate,
} from "./market-aggregate";

describe("cityMarketAggregate", () => {
  it("returns undefined for a city with no rent anchor", () => {
    expect(cityMarketAggregate("chula-vista")).toBeUndefined();
    expect(cityMarketAggregate("no-such-city")).toBeUndefined();
  });

  it("quotes 400 / 600 / 800 / 1200 sqft in ascending order", () => {
    const aggregate = cityMarketAggregate("san-diego");
    expect(aggregate?.rows.map((row) => row.size)).toEqual(
      [...CITY_MARKET_SIZES],
    );
  });

  it("maps sizes to bedroom classes the way the Studio does", () => {
    const aggregate = cityMarketAggregate("san-diego");
    expect(aggregate?.rows.map((row) => row.bedroom)).toEqual([
      "studio",
      "1br",
      "1br",
      "2br",
    ]);
  });

  it("computes the 400 sqft row from the county studio FMR through the Studio cost engine", () => {
    const aggregate = cityMarketAggregate("san-diego");
    const row = aggregate?.rows.find((entry) => entry.size === 400);
    // 400 * $340 (cedar) + $9,000 (openings) = $145,000 hard; * 1.18 soft.
    expect(row?.monthlyRent).toBe(2090);
    expect(row?.costLow).toBe(157000);
    expect(row?.costHigh).toBe(197000);
    expect(row?.annualNoi).toBe(16929);
    expect(row?.paybackYears).toBeCloseTo(10.1, 1);
  });

  it("computes payback for every quoted size", () => {
    const aggregate = cityMarketAggregate("san-diego");
    const expected = [10.1, 12.6, 16.6, 19.5];
    expect(aggregate?.rows).toHaveLength(expected.length);
    aggregate?.rows.forEach((row, index) => {
      expect(row.paybackYears, `${row.size} sqft payback`).toBeCloseTo(
        expected[index] ?? 0,
        1,
      );
    });
  });

  it("cites county HUD FMR provenance with medium confidence", () => {
    const aggregate = cityMarketAggregate("san-diego");
    expect(aggregate?.provenance).toMatchObject({
      source: "hud-county",
      area: "San Diego County, CA",
      confidence: "medium",
      verified: true,
    });
    expect(aggregate?.provenance.asOf).toContain("HUD FY2026 FMR");
  });
});
