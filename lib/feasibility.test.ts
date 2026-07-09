import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
} from "./feasibility";

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
});
