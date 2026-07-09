import type { ADUConfig, FinancialAssumptions, RentScenario } from "./feasibility";

/**
 * Computed financial projections for a proposed ADU.
 */
export interface FinanceResult {
  costLow: number;
  costHigh: number;
  costPerSqftLow: number;
  costPerSqftHigh: number;
  monthlyRent: number;
  annualNoi: number;
  paybackYears: number;
}

/**
 * Calculates the construction cost range, rental income, and simple payback.
 *
 * @param aduSqft - Floor area in square feet.
 * @param config - The proposed ADU design parameters.
 * @param assumptions - Cost and income assumptions to apply.
 * @param rentTable - Resolved monthly rent expectations across scenarios.
 * @returns A FinanceResult containing estimated costs and income.
 */
export function calculateFinance(
  aduSqft: number,
  config: ADUConfig,
  assumptions: FinancialAssumptions,
  rentTable: Record<RentScenario, number>,
): FinanceResult {
  const baseCostPerSqft = assumptions.costPerSqft[config.finish];
  const roofPremium = config.roof === "gable" ? 18 : config.roof === "flat" ? 8 : 0;
  const openingPremium = config.includeOpenings ? 9000 : 0;
  const hardCost = aduSqft * (baseCostPerSqft + roofPremium) + openingPremium;
  const costMid = hardCost * assumptions.softCostMultiplier;
  const costLow = Math.round((costMid * 0.92) / 1000) * 1000;
  const costHigh = Math.round((costMid * 1.15) / 1000) * 1000;

  const monthlyRent = rentTable[assumptions.rentScenario];
  const annualNoi = Math.round(monthlyRent * 12 * (1 - assumptions.operatingExpenseRatio));
  const paybackYears = Number((costMid / annualNoi).toFixed(1));

  return {
    costLow,
    costHigh,
costPerSqftLow: aduSqft > 0 ? Math.round(costLow / aduSqft) : 0,
    costPerSqftHigh: aduSqft > 0 ? Math.round(costHigh / aduSqft) : 0,
    monthlyRent,
    annualNoi,
    paybackYears,
  };
}
