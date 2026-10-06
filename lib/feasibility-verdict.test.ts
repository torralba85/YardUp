import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
  type FeasibilityResult,
} from "@/lib/feasibility";
import {
  buildableArea,
  summarizeFeasibility,
} from "@/lib/feasibility-verdict";
import type { PlacementResult } from "@/lib/placement-validation";

const preset = parcelPresets[0]; // oak-street: 5000 sf, 40×125, setbacks 20/25/5

describe("public GIS data uncertainty", () => {
  it.each([0, 1000])("keeps unverified rules in review with a %s sf footprint", (existingHouseSqft) => {
    const parcel = { ...preset, source: "county-gis", zoning: "Unknown", existingHouseSqft,
      lotArea: 6000, lotWidth: 60, lotLength: 100 };
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    const summary = summarizeFeasibility(parcel, result, defaultAduConfig);
    expect(result.zoningStatus).toBe("Review needed");
    expect(summary.verdict).toBe("Needs Review");
    for (const id of ["zoning", "buildable", "coverage", "capacity"]) {
      expect(summary.constraints.find((item) => item.id === id)?.status).toBe("review");
    }
    expect(summary.constraints.find((item) => item.id === "zoning")?.detail).not.toContain("appears permitted");
    if (existingHouseSqft === 0) {
      expect(summary.constraints.find((item) => item.id === "coverage")?.value).toBe("Unknown");
      expect(summary.constraints.find((item) => item.id === "capacity")?.value).toBe("Unknown");
    }
  });
});

/**
 * A compliant baseline result for the default preset + config. Crafted so each
 * verdict branch can be exercised by overriding individual fields, independent
 * of the engine's internal coupling between coverage and capacity.
 */
function baseResult(overrides: Partial<FeasibilityResult> = {}): FeasibilityResult {
  return {
    aduSqft: 600,
    totalFootprint: 1980,
    allowedFootprint: 2000,
    remainingCapacity: 20,
    coveragePercent: 39.6,
    maxCoveragePercent: 40,
    zoningStatus: "Compliant",
    costLow: 200000,
    costHigh: 260000,
    costPerSqftLow: 333,
    costPerSqftHigh: 433,
    monthlyRent: 2050,
    annualNoi: 16600,
    paybackYears: 13,
    warnings: [],
    rentBasis: "Curated demo estimate",
    market: {
      source: "preset",
      area: "Curated demo estimate",
      confidence: "medium",
      verified: false,
    },
    operatingExpenseRatio: 0.325,
    ...overrides,
  };
}

describe("buildableArea", () => {
  it("never reports the bounding rectangle as land outside an irregular parcel", () => {
    const feet = 364000;
    const ring = [[0, 0], [50, 0], [50, 50], [25, 50], [25, 100], [0, 100], [0, 0]];
    const parcel = { ...preset, lotArea: 3750, lotWidth: 50, lotLength: 100, setbacks: { front: 20, rear: 20, side: 5 }, boundaryGeoJson: { type: "Polygon" as const, coordinates: [ring.map(([x, y]) => [x / feet, y / feet])] } };
    expect(buildableArea(parcel)).toBe(1800);
    expect(buildableArea({ ...parcel, lotArea: 1700 })).toBe(1700);
  });
  it("applies setbacks to the lot envelope", () => {
    // (40 - 2*5) * (125 - 20 - 25) = 30 * 80
    expect(buildableArea(preset)).toBe(2400);
  });
});

describe("summarizeFeasibility", () => {
  it("requires frontage review for live land even when setback values are recorded", () => {
    const live = { ...preset, source: "regrid", zoning: "R-1" };
    const summary = summarizeFeasibility(live, baseResult(), defaultAduConfig);
    expect(summary.constraints.find((item) => item.id === "buildable")?.status).toBe("review");
    expect(summary.constraints.find((item) => item.id === "buildable")?.detail).toContain("Frontage");
  });
  const fittedPlacement: PlacementResult = {
    status: "fits", envelopeStatus: "fits", houseStatus: "clear",
    envelopeClearanceFt: 5, houseClearanceFt: 15, roofClearanceFt: 12,
    reasons: [], rotatedAlternative: null,
  };

  it("preserves a curated demo fit's verdict and readiness", () => {
    const summary = summarizeFeasibility(preset, baseResult(), defaultAduConfig, fittedPlacement);
    expect(summary.constraints.find((c) => c.id === "placement")?.status).toBe("clear");
    expect(summary.verdict).toBe("Likely Feasible");
    expect(summary.readiness).toBe(82);
    expect(summary.openCount).toBe(2);
  });

  it.each([null, { type: "Polygon", coordinates: [] }])(
    "counts an evidence-qualified live model fit as an open review item",
    (boundaryGeoJson) => {
      const { expectedRent, ...liveParcel } = preset;
      expect(expectedRent).toBeDefined();
      const parcel = { ...liveParcel, source: "regrid", zoning: "R-1", boundaryGeoJson };
      const summary = summarizeFeasibility(parcel, baseResult(), defaultAduConfig, fittedPlacement);
      expect(summary.constraints.find((c) => c.id === "placement")?.status).toBe("review");
      expect(summary.verdict).toBe("Needs Review");
      expect(summary.readiness).toBe(67);
      expect(summary.openCount).toBe(3);
      expect(summary.reviewNote).toBe("3 items to confirm before permit");
    },
  );

  it("rates the default compliant lot as Likely Feasible / 82", () => {
    const summary = summarizeFeasibility(preset, baseResult(), defaultAduConfig);
    expect(summary.verdict).toBe("Likely Feasible");
    expect(summary.readiness).toBe(82); // 100 - 9*(utilities + easements)
    expect(summary.openCount).toBe(2); // the two always-verify-locally lines
    expect(summary.buildableSqft).toBe(2400);
    // No engine-known blockers on a compliant lot.
    expect(summary.constraints.filter((c) => c.status === "blocked")).toHaveLength(0);
  });

  it("marks an over-coverage concept as Needs Review and penalizes it once", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult({
        zoningStatus: "Review needed",
        remainingCapacity: -980,
        coveragePercent: 59.6,
      }),
      defaultAduConfig,
    );
    expect(summary.verdict).toBe("Needs Review");
    expect(summary.readiness).toBe(57); // 100 - 25 coverage - 18 local verification
    expect(summary.openCount).toBe(3);
    expect(
      summary.constraints.filter((c) => c.status === "blocked").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("is Needs Review when zoning is flagged but nothing is fully blocked", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult({ zoningStatus: "Review needed" }), // capacity/coverage still OK
      defaultAduConfig,
    );
    expect(summary.verdict).toBe("Needs Review");
    expect(summary.constraints.filter((c) => c.status === "blocked")).toHaveLength(0);
    // zoning + utilities + easements are open → 100 - 9*3.
    expect(summary.readiness).toBe(73);
    expect(summary.openCount).toBe(3);
  });

  it("is Unlikely when the setback envelope cannot fit a minimum 20 by 20 unit", () => {
    const narrowParcel = {
      ...preset,
      lotWidth: 28,
      lotLength: 50,
      setbacks: { front: 10, rear: 10, side: 5 },
    };
    const summary = summarizeFeasibility(
      narrowParcel,
      baseResult(),
      defaultAduConfig,
    );

    expect(summary.buildableSqft).toBe(540);
    expect(summary.verdict).toBe("Unlikely");
    expect(summary.readiness).toBe(27);
  });

  it("marks a selected concept that misses the envelope as Needs Review", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult(),
      { width: 31, length: 70 },
    );

    expect(summary.verdict).toBe("Needs Review");
    expect(summary.readiness).toBe(67);
    expect(summary.constraints.find((c) => c.id === "buildable")?.status).toBe("review");
  });

  it("uses remaining capacity consistently for coverage rows and verdict", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult({ coveragePercent: 40.01, remainingCapacity: 1 }),
      defaultAduConfig,
    );

    expect(summary.verdict).toBe("Likely Feasible");
    expect(summary.constraints.find((c) => c.id === "coverage")?.status).toBe("clear");
  });

  it("always surfaces utilities and easements as verify-locally review lines", () => {
    const summary = summarizeFeasibility(preset, baseResult());
    const ids = summary.constraints
      .filter((c) => c.status === "review")
      .map((c) => c.id);
    expect(ids).toContain("utilities");
    expect(ids).toContain("easements");
  });
});

describe("summarizeFeasibility · real engine output", () => {
  it("agrees with calculateFeasibility for the default preset", () => {
    const result = calculateFeasibility(
      preset,
      defaultAduConfig,
      defaultFinancialAssumptions,
      preset.expectedRent,
    );
    const summary = summarizeFeasibility(preset, result);
    expect(result.zoningStatus).toBe("Compliant");
    expect(summary.verdict).toBe("Likely Feasible");
    expect(summary.readiness).toBe(82);
  });
});
