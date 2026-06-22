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

const preset = parcelPresets[0]; // oak-street: 5000 sf, 40×125, setbacks 20/25/5

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
    ...overrides,
  };
}

describe("buildableArea", () => {
  it("applies setbacks to the lot envelope", () => {
    // (40 - 2*5) * (125 - 20 - 25) = 30 * 80
    expect(buildableArea(preset)).toBe(2400);
  });
});

describe("summarizeFeasibility", () => {
  it("rates the default compliant lot as Likely Feasible / 82", () => {
    const summary = summarizeFeasibility(preset, baseResult());
    expect(summary.verdict).toBe("Likely Feasible");
    expect(summary.readiness).toBe(82); // 100 - 9*(utilities + easements)
    expect(summary.openCount).toBe(2); // the two always-verify-locally lines
    expect(summary.buildableSqft).toBe(2400);
    // No engine-known blockers on a compliant lot.
    expect(summary.constraints.filter((c) => c.status === "blocked")).toHaveLength(0);
  });

  it("flips to Unlikely when coverage and capacity are both blown", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult({
        zoningStatus: "Review needed",
        remainingCapacity: -980,
        coveragePercent: 59.6,
      }),
    );
    expect(summary.verdict).toBe("Unlikely");
    expect(
      summary.constraints.filter((c) => c.status === "blocked").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("is Needs Review when zoning is flagged but nothing is fully blocked", () => {
    const summary = summarizeFeasibility(
      preset,
      baseResult({ zoningStatus: "Review needed" }), // capacity/coverage still OK
    );
    expect(summary.verdict).toBe("Needs Review");
    expect(summary.constraints.filter((c) => c.status === "blocked")).toHaveLength(0);
    // zoning + utilities + easements are open → 100 - 9*3.
    expect(summary.readiness).toBe(73);
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
