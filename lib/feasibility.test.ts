import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
} from "./feasibility";

describe("calculateFeasibility", () => {
  it("treats the default 600 sf concept as compliant on the typical lot", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);

    expect(result.aduSqft).toBe(600);
    expect(result.zoningStatus).toBe("Compliant");
    expect(result.remainingCapacity).toBeGreaterThanOrEqual(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags a 1,000 sf concept on the compact lot as review needed", () => {
    const parcel = getParcelById("compact-lot");
    const enlarged = configForFootprint(1000, defaultAduConfig);
    const result = calculateFeasibility(parcel, enlarged, defaultFinancialAssumptions);

    expect(result.aduSqft).toBe(1000);
    expect(result.zoningStatus).toBe("Review needed");
    expect(result.warnings[0]).toMatch(/coverage allowance/i);
  });

  it("updates monthly rent and annual NOI when scenario changes to market", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFeasibility(parcel, defaultAduConfig, {
      ...defaultFinancialAssumptions,
      rentScenario: "market",
    });

    expect(result.monthlyRent).toBe(2350);
    expect(result.annualNoi).toBe(
      Math.round(2350 * 12 * (1 - defaultFinancialAssumptions.operatingExpenseRatio)),
    );
  });

  it("changes cost range when the exterior finish changes", () => {
    const parcel = getParcelById("oak-street");
    const cedar = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    const board = calculateFeasibility(
      parcel,
      { ...defaultAduConfig, finish: "board" },
      defaultFinancialAssumptions,
    );

    expect(board.costLow).toBeGreaterThan(cedar.costLow);
    expect(board.costHigh).toBeGreaterThan(cedar.costHigh);
  });

  it("exposes a parcel preset for every documented option", () => {
    expect(parcelPresets.length).toBeGreaterThanOrEqual(3);
    parcelPresets.forEach((preset) => {
      expect(preset.lotArea).toBeGreaterThan(0);
      expect(preset.expectedRent.conservative).toBeGreaterThan(0);
    });
  });
});
