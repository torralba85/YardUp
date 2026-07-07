import { describe, expect, it } from "vitest";
import { calculateFinance } from "./finance";
import { defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

describe("calculateFinance", () => {
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
