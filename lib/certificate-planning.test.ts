import { describe, expect, it } from "vitest";
import { DEFAULT_FINANCING, feeReview, financingBreakdown, monthlyPayment, planningRows } from "./certificate-planning";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";

const parcel = parcelPresets[0];
const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions, parcel.expectedRent);
describe("certificate financing worksheet", () => {
  it("amortizes a known loan and handles zero interest", () => {
    expect(monthlyPayment(100000, { ...DEFAULT_FINANCING, annualRate: 6, years: 30 })).toBeCloseTo(599.5505, 3);
    expect(monthlyPayment(120000, { ...DEFAULT_FINANCING, annualRate: 0, years: 10 })).toBe(1000);
  });
  it("does not repay principal in the interest-only illustration", () => {
    expect(monthlyPayment(120000, { ...DEFAULT_FINANCING, annualRate: 6, paymentType: "interest-only" })).toBe(600);
  });
  it("subtracts operating expenses and the higher debt payment from the low cash-flow result", () => {
    const value = financingBreakdown(result, DEFAULT_FINANCING);
    expect(value.cashFlowLow).toBeCloseTo(result.annualNoi / 12 - value.paymentHigh);
    expect(value.cashFlowLow).toBeLessThanOrEqual(value.cashFlowHigh);
  });
  it.each([NaN, Infinity, -1, 31])("rejects invalid rates %s", (annualRate) => {
    expect(() => monthlyPayment(100000, { ...DEFAULT_FINANCING, annualRate })).toThrow();
  });
  it("never implies that a 750 sq ft design or an unknown overlay is exempt or clear", () => {
    const local = { ...parcel, city: "San Diego, CA" };
    expect(feeReview(local, 749).join(" ")).toContain("below 750");
    expect(feeReview(local, 750).join(" ")).toContain("at or above 750");
    expect(feeReview(local, 750).join(" ")).toContain("Coastal overlay: not checked");
    expect(feeReview(local, 750).join(" ")).toContain("no fee waiver or dollar savings is verified");
    expect(feeReview(parcel, 600).join(" ")).toContain("not assessed");
    expect(planningRows(local, result).some(([label]) => label === "Contractor bid-leveling checklist")).toBe(true);
  });
});
