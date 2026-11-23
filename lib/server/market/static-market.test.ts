import { describe, expect, it } from "vitest";
import { resolveStaticMarket } from "./static-market";
import fmr from "./data/fmr.json";
import { CA_COUNTY_RENTS } from "@/content/adu/ca/rent";

describe("resolveStaticMarket", () => {
  it("prefers the ZIP tier when the ZIP is known", () => {
    const md = resolveStaticMarket({
      lat: 47.6,
      lng: -122.4,
      zip: "98107",
      county: "King",
      state: "WA",
    });
    expect(md.source).toBe("hud-zip");
    expect(md.rentByBedroom["1br"]).toBe(2050);
    expect(md.area).toBe("Ballard, Seattle WA (ZIP 98107)");
    expect(md.costMultiplier).toBe(1.15);
    expect(md.confidence).toBe("high");
    expect(md.components?.rent).toMatchObject({
      status: "observed",
      confidence: "high",
      source: { provider: "HUD", dataset: "Fair Market Rents" },
    });
    expect(md.components?.constructionCost).toMatchObject({
      status: "derived",
      confidence: "medium",
      source: { provider: "LotFoundry", dataset: "Regional construction cost factors" },
    });
    expect(md.components?.operatingExpenses).toMatchObject({
      status: "derived",
      source: { provider: "LotFoundry", dataset: "Regional operating-expense factors" },
    });
    expect(md.components?.constructionCost.sourceAsOf).toBe(costsAsOf());
  });

  it("falls back to county, then state, then national", () => {
    expect(resolveStaticMarket({ lat: 0, lng: 0, county: "King", state: "WA" }).source).toBe(
      "hud-county",
    );
    expect(resolveStaticMarket({ lat: 0, lng: 0, state: "WA" }).source).toBe("state");
    expect(resolveStaticMarket({ lat: 0, lng: 0 }).source).toBe("national");
  });

  it("returns materially different rent for California vs Texas counties", () => {
    const la = resolveStaticMarket({ lat: 34.05, lng: -118.24, county: "Los Angeles", state: "CA" });
    const austin = resolveStaticMarket({ lat: 30.27, lng: -97.74, county: "Travis", state: "TX" });
    expect(la.rentByBedroom["1br"]).toBe(2402);
    expect(austin.rentByBedroom["1br"]).toBe(1562);
    expect(la.rentByBedroom["1br"]).toBeGreaterThan(austin.rentByBedroom["1br"]);
    expect(la.costMultiplier).toBeGreaterThan(austin.costMultiplier);
  });

  it("resolves county-level HUD FMRs and regional cost multipliers across all 12 covered California counties", () => {
    const caCounties = [
      "Los Angeles",
      "Orange",
      "San Diego",
      "Ventura",
      "Riverside",
      "San Bernardino",
      "Santa Barbara",
      "Santa Clara",
      "San Mateo",
      "Alameda",
      "Contra Costa",
      "Sacramento",
    ];
    for (const county of caCounties) {
      const md = resolveStaticMarket({ lat: 34.0, lng: -118.0, county, state: "CA" });
      expect(md.source, `${county} source`).toBe("hud-county");
      expect(md.confidence, `${county} confidence`).toBe("medium");
      expect(md.rentByBedroom["1br"], `${county} 1br rent`).toBeGreaterThan(1700);
      expect(md.costMultiplier, `${county} costMultiplier`).toBeGreaterThan(1.1);
    }
  });

  it("localizes the operating-expense ratio and discloses its breakdown", () => {
    const ca = resolveStaticMarket({ lat: 0, lng: 0, state: "CA" });
    const tx = resolveStaticMarket({ lat: 0, lng: 0, state: "TX" });
    expect(ca.operatingExpenseRatio).toBe(0.305);
    expect(tx.operatingExpenseRatio).toBe(0.365);
    expect(tx.opexBreakdown?.propertyTax).toBe(0.085);
    const sum = Object.values(tx.opexBreakdown ?? {}).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(tx.operatingExpenseRatio ?? 0, 5);
  });

  it("keeps every California county row equal to the verified HUD table", () => {
    const counties = fmr.counties as Record<string, unknown>;
    const caKeys = Object.keys(counties).filter((key) => key.startsWith("CA/"));
    expect(caKeys).toHaveLength(CA_COUNTY_RENTS.length);
    for (const row of CA_COUNTY_RENTS) {
      expect(counties[`CA/${row.county}`], row.county).toEqual(row.fy2027);
    }
  });

  it("labels California county rents with the verified vintage and other tiers as seeds", () => {
    const sd = resolveStaticMarket({ lat: 32.72, lng: -117.16, county: "San Diego", state: "CA" });
    expect(sd.asOf).toBe("HUD FY2027 FMR (effective 2026-10-01)");
    expect(sd.sourceUrl).toBe("https://www.huduser.gov/datasets/fmr/fmr2027");
    expect(sd.components?.rent.sourceAsOf).toBe(sd.asOf);
    const king = resolveStaticMarket({ lat: 47.6, lng: -122.3, county: "King", state: "WA" });
    expect(king.asOf).toContain("seed extract");
    expect(king.asOf).toContain("effective 2025-10-01");
  });

  it("uses HUD's October 1 fiscal-year effective date in every FMR vintage string", () => {
    for (const label of [fmr.asOf, fmr.californiaCountiesAsOf]) {
      const match = label.match(/HUD FY(\d{4}) FMR \(effective (\d{4}-\d{2}-\d{2})/);
      expect(match, `HUD FMR label format: ${label}`).not.toBeNull();
      const fiscalYear = Number(match![1]);
      expect(match![2], `effective date for FY${fiscalYear}`).toBe(`${fiscalYear - 1}-10-01`);
    }
  });

  it("marks the national fallback low-confidence with provenance intact", () => {
    const md = resolveStaticMarket({ lat: 0, lng: 0 });
    expect(md.costMultiplier).toBe(1);
    expect(md.confidence).toBe("low");
    expect(md.asOf).toContain("HUD FY2026");
    expect(md.sourceUrl).toContain("huduser.gov");
    expect(md.retrievedAt).toBeTruthy();
  });

  it("carries the structured geography it resolved for", () => {
    const md = resolveStaticMarket({ lat: 0, lng: 0, zip: "78704", county: "Travis", state: "tx" });
    expect(md.geography).toEqual({ state: "TX", county: "Travis", zip: "78704" });
  });
});

function costsAsOf() {
  return "Regional construction cost factors (seed, 2026)";
}
