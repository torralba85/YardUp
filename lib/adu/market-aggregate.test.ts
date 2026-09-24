import { describe, expect, it } from "vitest";
import {
  CALCULATOR_COUNTIES,
  CITY_MARKET_SIZES,
  cityMarketAggregate,
  countyMarketAggregate,
  countyProvenance,
  estimateAdu,
} from "./market-aggregate";

describe("countyMarketAggregate", () => {
  it("has an anchor for every calculator county", () => {
    for (const county of CALCULATOR_COUNTIES) {
      expect(countyMarketAggregate(county.slug), county.slug).toBeDefined();
    }
    expect(countyMarketAggregate("alameda")).toBeUndefined();
  });

  it("matches the San Diego city page figures exactly", () => {
    expect(countyMarketAggregate("san-diego")?.rows).toEqual(
      cityMarketAggregate("san-diego")?.rows,
    );
  });

  it("computes Los Angeles and Santa Clara payback from their own HUD rents", () => {
    // Build cost is on the national base, so only rent differs by county.
    expect(
      countyMarketAggregate("los-angeles")?.rows.map((row) => row.paybackYears),
    ).toEqual([10.7, 13.3, 17.6, 20.5]);
    expect(
      countyMarketAggregate("santa-clara")?.rows.map((row) => row.paybackYears),
    ).toEqual([8.3, 10.4, 13.7, 16]);
  });

  it("cites the county by name", () => {
    expect(countyProvenance("santa-clara")?.area).toBe("Santa Clara County, CA");
  });
});

describe("estimateAdu", () => {
  it("reproduces the table row at the table's defaults", () => {
    const row = countyMarketAggregate("los-angeles")?.rows.find((entry) => entry.size === 600);
    expect(
      estimateAdu({ county: "los-angeles", size: 600, finish: "cedar", rentScenario: "conservative" }),
    ).toEqual(row);
  });

  it("applies the finish cost and the rent spread", () => {
    const estimate = estimateAdu({
      county: "los-angeles",
      size: 600,
      finish: "lap",
      rentScenario: "market",
    });
    // 600 * $315 (lap) + $9,000 = $198,000 hard; * 1.18 = $233,640 mid.
    expect(estimate?.costLow).toBe(215000);
    expect(estimate?.costHigh).toBe(269000);
    // 1-bed FMR $2,328 * 1.12.
    expect(estimate?.monthlyRent).toBe(2607);
  });

  it("returns undefined for an unknown county", () => {
    expect(
      estimateAdu({ county: "nowhere", size: 600, finish: "cedar", rentScenario: "conservative" }),
    ).toBeUndefined();
  });
});

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
