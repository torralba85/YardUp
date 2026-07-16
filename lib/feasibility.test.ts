import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
} from "./feasibility";
import type { LiveParcelData } from "./parcel-types";
import type { MarketData } from "./market/market-types";

/** A live parcel with the given market data (LA-vs-Austin style fixtures). */
function liveParcel(marketData: MarketData | undefined, city: string): LiveParcelData {
  return {
    address: "1 Test St",
    city,
    lotArea: 5000,
    lotWidth: 50,
    lotLength: 100,
    existingHouseSqft: 1200,
    maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 20, side: 5 },
    zoning: "R-1",
    boundaryGeoJson: null,
    lat: 0,
    lng: 0,
    source: "regrid",
    state: "",
    zip: "",
    marketData,
  };
}

const laMarket: MarketData = {
  rentByBedroom: { studio: 1979, "1br": 2328, "2br": 2957 },
  costMultiplier: 1.3,
  operatingExpenseRatio: 0.305,
  source: "hud-county",
  area: "Los Angeles County, CA",
  asOf: "HUD FY2026 FMR",
  confidence: "medium",
};

const austinMarket: MarketData = {
  rentByBedroom: { studio: 1328, "1br": 1562, "2br": 1984 },
  costMultiplier: 0.97,
  operatingExpenseRatio: 0.365,
  source: "hud-county",
  area: "Travis County, TX",
  asOf: "HUD FY2026 FMR",
  confidence: "medium",
};

describe("calculateFeasibility", () => {
  it("orchestrates zoning and finance calculations to produce a full result", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);

    // Checks that zoning results are present
    expect(result.aduSqft).toBe(600);
    expect(result.zoningStatus).toBe("Compliant");

    // Checks that finance results are present
    expect(result.monthlyRent).toBe(2050); // conservative scenario on oak-street
    expect(result.paybackYears).toBeGreaterThan(0);
  });

  it("exposes a parcel preset for every documented option", () => {
    expect(parcelPresets.length).toBeGreaterThanOrEqual(3);
    parcelPresets.forEach((preset) => {
      expect(preset.lotArea).toBeGreaterThan(0);
      expect(preset.expectedRent.conservative).toBeGreaterThan(0);
    });
  });

  it("uses localized market rent for a live parcel, never the lot-size heuristic", () => {
    const result = calculateFeasibility(
      liveParcel(laMarket, "Los Angeles, CA 90026"),
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    // Default 600 sf footprint → 1br → the LA county conservative anchor.
    expect(result.monthlyRent).toBe(2328);
    expect(result.rentBasis).toBe("HUD FMR · Los Angeles County, CA · 1-bed");
    expect(result.market.verified).toBe(true);
    expect(result.warnings.join(" ")).not.toMatch(/market data is unavailable/i);
  });

  it("produces different rent, cost, NOI, and payback for LA vs Austin on identical lots", () => {
    const la = calculateFeasibility(
      liveParcel(laMarket, "Los Angeles, CA 90026"),
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    const austin = calculateFeasibility(
      liveParcel(austinMarket, "Austin, TX 78704"),
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    expect(la.monthlyRent).toBeGreaterThan(austin.monthlyRent);
    expect(la.costLow).toBeGreaterThan(austin.costLow);
    expect(la.annualNoi).not.toBe(austin.annualNoi);
    expect(la.paybackYears).not.toBe(austin.paybackYears);
    // Localized operating expenses, not one nationwide constant.
    expect(la.operatingExpenseRatio).toBe(0.305);
    expect(austin.operatingExpenseRatio).toBe(0.365);
  });

  it("falls back to the national benchmark with a strong warning when a live parcel has no market data", () => {
    const result = calculateFeasibility(
      liveParcel(undefined, "Los Angeles, CA 90026"),
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    // National public benchmark, not the lot-size heuristic (5000 sf → $2,100).
    expect(result.monthlyRent).toBe(1500);
    expect(result.market.source).toBe("national");
    expect(result.market.verified).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/verified local market data is unavailable/i);
  });

  it("keeps a user-tuned operating expense ratio over the localized one", () => {
    const result = calculateFeasibility(
      liveParcel(austinMarket, "Austin, TX 78704"),
      defaultAduConfig,
      { ...defaultFinancialAssumptions, operatingExpenseRatio: 0.4 },
    );
    expect(result.operatingExpenseRatio).toBe(0.4);
  });

  it("labels preset rent as a curated estimate and stays unchanged", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
      parcel.expectedRent,
    );
    expect(result.monthlyRent).toBe(2050);
    expect(result.rentBasis).toBe("Curated demo estimate");
    expect(result.market.source).toBe("preset");
    expect(result.warnings.join(" ")).not.toMatch(/market data/i);
  });
});
