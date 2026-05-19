import { describe, expect, it } from "vitest";

import { estimateAduValue } from "./estimator";
import type { EstimateInput } from "./types";

const baseInput: EstimateInput = {
  aduType: "detached",
  aduSqFt: 600,
  buildCostPerSqFt: 400,
  softCostRate: 0.2,
  contingencyRate: 0.1,
  monthlyRent: 3000,
  opExRate: 0.25,
  capRate: 0.06,
};

describe("estimateAduValue", () => {
  it("calculates auditable ROI, NOI, payback, and value range", () => {
    const result = estimateAduValue(baseInput);

    expect(result.annualRent).toBe(36000);
    expect(result.annualOpEx).toBe(9000);
    expect(result.annualNOI).toBe(27000);
    expect(result.totalCost).toBe(312000);
    expect(result.lowValue).toBe(405000);
    expect(result.highValue).toBe(495000);
    expect(result.roi).toBeCloseTo(0.0865, 4);
    expect(result.paybackYears).toBeCloseTo(11.556, 3);
  });

  it("responds to rent sensitivity without changing construction cost", () => {
    const lowRent = estimateAduValue({ ...baseInput, monthlyRent: 2500 });
    const highRent = estimateAduValue({ ...baseInput, monthlyRent: 3500 });

    expect(highRent.totalCost).toBe(lowRent.totalCost);
    expect(highRent.annualNOI).toBeGreaterThan(lowRent.annualNOI);
    expect(highRent.lowValue).toBeGreaterThan(lowRent.lowValue);
  });
});
