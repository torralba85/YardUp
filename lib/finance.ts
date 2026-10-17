import type { ADUConfig, FinancialAssumptions, RentScenario } from "./feasibility";

/**
 * Computed financial projections for a proposed ADU.
 */
export interface FinanceResult {
  costBreakdown: ConstructionBudget;
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

export interface ConstructionBudget {
  baseConstruction: number;
  roofPremium: number;
  openings: number;
  regionalAdjustment: number;
  softCosts: number;
  total: number;
}

export const constructionBudgetNote = "Modeled allowances, not contractor quotes. Construction is a bundled assumption; site work, utility extensions, soil conditions, and local fees need project-specific quotes. Soft costs combine design, engineering, and permits; they are not separately priced.";

export function constructionBudgetRows(budget: ConstructionBudget): Array<[string, number]> {
  return [
    ["Construction base", budget.baseConstruction],
    ["Roof premium", budget.roofPremium],
    ["Openings allowance", budget.openings],
    ["Regional hard-cost adjustment", budget.regionalAdjustment],
    ["Soft-cost allowance", budget.softCosts],
  ];
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

  // Whole dollars that still sum exactly to the central estimate: the CSV export
  // prints these raw, and regional multipliers otherwise leave float noise.
  const baseConstruction = Math.round(aduSqft * baseCostPerSqft);
  const roofCost = Math.round(aduSqft * roofPremium);
  const hardTotal = Math.round(hardCost);
  const budgetTotal = Math.round(costMid);

  return {
    costBreakdown: {
      baseConstruction,
      roofPremium: roofCost,
      openings: openingPremium,
      regionalAdjustment: hardTotal - baseConstruction - roofCost - openingPremium,
      softCosts: budgetTotal - hardTotal,
      total: budgetTotal,
    },
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
