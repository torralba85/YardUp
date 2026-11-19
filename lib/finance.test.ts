import { describe, expect, it } from "vitest";
import { calculateFinance, constructionBudgetRows, formatPaybackYears, hasValidPayback } from "./finance";
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
  it("keeps cost allowances in whole dollars under fractional regional multipliers", () => {
    const result = calculateFinance(600, { ...defaultAduConfig, roof: "gable" }, defaultFinancialAssumptions, getParcelById("oak-street").expectedRent, { costMultiplier: 1.08 });
    const rows = constructionBudgetRows(result.costBreakdown);
    for (const [, value] of rows) expect(Number.isInteger(value)).toBe(true);
    expect(rows.reduce((sum, [, value]) => sum + value, 0)).toBe(result.costBreakdown.total);
    expect(result.costBreakdown.total).toBe(Math.round((600 * 358 + 9000) * 1.08 * defaultFinancialAssumptions.softCostMultiplier));
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

  it("formats non-positive or non-finite payback as '—'", () => {
    expect(hasValidPayback(13.3, 18914)).toBe(true);
    expect(hasValidPayback(Number.POSITIVE_INFINITY, 0)).toBe(false);
    expect(hasValidPayback(-10, -500)).toBe(false);
    expect(formatPaybackYears(13.3, 18914, "yrs")).toBe("13.3 yrs");
    expect(formatPaybackYears(Number.POSITIVE_INFINITY, 0, "yrs")).toBe("—");
    expect(formatPaybackYears(-5, -100, "years")).toBe("—");
    expect(formatPaybackYears(0, 0, "none")).toBe("—");
  });
});
