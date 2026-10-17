import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

export const landingDemos = {
  seattle: { city: "Seattle", region: "WA", parcelId: "oak-street", name: "Oak Street" },
  portland: { city: "Portland", region: "OR", parcelId: "corner-lot", name: "Linden Avenue" },
  austin: { city: "Austin", region: "TX", parcelId: "compact-lot", name: "Mesa Court" },
} as const;
export type LandingCity = keyof typeof landingDemos;
export type LandingDemo = (typeof landingDemos)[LandingCity];

export function landingScenarios(city: LandingCity = "seattle") {
  return (["conservative", "market", "optimistic"] as const).map((id) => {
    const result = calculateFeasibility(getParcelById(landingDemos[city].parcelId), defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: id });
    return { id, costLow: result.costLow, costHigh: result.costHigh, rent: result.monthlyRent, noi: result.annualNoi, payback: result.paybackYears, expenseRatio: result.operatingExpenseRatio, costBreakdown: result.costBreakdown };
  });
}
