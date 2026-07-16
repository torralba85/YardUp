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
  /** The operating-expense ratio actually applied to gross rent (0–1). */
  operatingExpenseRatio: number;
}

/** Location adjustments resolved from the parcel's market data. */
export interface MarketAdjustments {
  /** Regional build-cost factor; 1.0 = national base. */
  costMultiplier?: number;
  /** Localized share of gross rent consumed by operating expenses (0–1). */
  operatingExpenseRatio?: number;
}

/**
 * Calculates the construction cost range, rental income, and simple payback.
 *
 * @param aduSqft - Floor area in square feet.
 * @param config - The proposed ADU design parameters.
 * @param assumptions - Cost and income assumptions to apply.
 * @param rentTable - Resolved monthly rent expectations across scenarios.
 * @param market - Optional location adjustments: a regional cost multiplier
 *   applied to hard cost, and a localized operating-expense ratio that
 *   replaces the nationwide default when present.
 * @returns A FinanceResult containing estimated costs and income.
 */
export function calculateFinance(
  aduSqft: number,
  config: ADUConfig,
  assumptions: FinancialAssumptions,
  rentTable: Record<RentScenario, number>,
  market?: MarketAdjustments,
): FinanceResult {
  const baseCostPerSqft = assumptions.costPerSqft[config.finish];
  const roofPremium = config.roof === "gable" ? 18 : config.roof === "flat" ? 8 : 0;
  const openingPremium = config.includeOpenings ? 9000 : 0;
  const costMultiplier = market?.costMultiplier ?? 1;
  const hardCost =
    (aduSqft * (baseCostPerSqft + roofPremium) + openingPremium) * costMultiplier;
  const costMid = hardCost * assumptions.softCostMultiplier;
  const costLow = Math.round((costMid * 0.92) / 1000) * 1000;
  const costHigh = Math.round((costMid * 1.15) / 1000) * 1000;

  const monthlyRent = rentTable[assumptions.rentScenario];
  const operatingExpenseRatio =
    market?.operatingExpenseRatio ?? assumptions.operatingExpenseRatio;
  const annualNoi = Math.round(monthlyRent * 12 * (1 - operatingExpenseRatio));
  const paybackYears = Number((costMid / annualNoi).toFixed(1));

  return {
    costLow,
    costHigh,
    costPerSqftLow: aduSqft > 0 ? Math.round(costLow / aduSqft) : 0,
    costPerSqftHigh: aduSqft > 0 ? Math.round(costHigh / aduSqft) : 0,
    monthlyRent,
    annualNoi,
    paybackYears,
    operatingExpenseRatio,
  };
}
