import { describe, expect, it } from "vitest";
import { calculateFinance, constructionBudgetRows } from "./finance";
import { defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

describe("calculateFinance", () => {
  it("reconciles hard and soft allowances to the central estimate after custom and regional adjustments", () => {
    const assumptions = { ...defaultFinancialAssumptions, softCostMultiplier: 1.25 };
    const result = calculateFinance(600, { ...defaultAduConfig, roof: "gable" }, assumptions, getParcelById("oak-street").expectedRent, { costMultiplier: 1.3 });
    expect(result.costBreakdown.baseConstruction).toBe(600 * 340);
    expect(result.costBreakdown.roofPremium).toBe(600 * 18);
    expect(result.costBreakdown.openings).toBe(9000);
    const hard = (600 * (340 + 18) + 9000) * 1.3;
    expect(result.costBreakdown.softCosts).toBeCloseTo(hard * 0.25);
    const total = constructionBudgetRows(result.costBreakdown).reduce((sum, [, value]) => sum + value, 0);
    expect(total).toBeCloseTo(result.costBreakdown.total);
    expect(result.costLow).toBe(Math.round(total * 0.92 / 1000) * 1000);
    expect(result.costHigh).toBe(Math.round(total * 1.15 / 1000) * 1000);
  });
  it("updates monthly rent and annual NOI when scenario changes to market", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateFinance(600, defaultAduConfig, {
      ...defaultFinancialAssumptions,
      rentScenario: "market",
    }, parcel.expectedRent);

    expect(result.monthlyRent).toBe(2350);
    expect(result.annualNoi).toBe(
      Math.round(2350 * 12 * (1 - defaultFinancialAssumptions.operatingExpenseRatio)),
    );
  });

  it("changes cost range when the exterior finish changes", () => {
    const parcel = getParcelById("oak-street");
    const cedar = calculateFinance(600, defaultAduConfig, defaultFinancialAssumptions, parcel.expectedRent);
    const board = calculateFinance(
      600,
      { ...defaultAduConfig, finish: "board" },
      defaultFinancialAssumptions,
      parcel.expectedRent
    );

    expect(board.costLow).toBeGreaterThan(cedar.costLow);
    expect(board.costHigh).toBeGreaterThan(cedar.costHigh);
  });
});
