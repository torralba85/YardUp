import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

export interface LandingDemo {
  city: string;
  region: string;
  parcelId: string;
  name: string;
  note?: string;
}

export const landingDemos = {
  seattle: { city: "Seattle", region: "WA", parcelId: "oak-street", name: "Oak Street", note: "Demo rent bands are curated assumptions." },
  portland: { city: "Portland", region: "OR", parcelId: "corner-lot", name: "Linden Avenue", note: "Demo rent bands are curated assumptions." },
  austin: { city: "Austin", region: "TX", parcelId: "compact-lot", name: "Mesa Court", note: "Demo rent bands are curated assumptions." },
  "san-diego": { city: "San Diego", region: "CA", parcelId: "coyote-brush", name: "Coyote Brush Court", note: "Rent bands start from HUD's FY2027 Fair Market Rent for a one-bedroom in San Diego County ($2,335/mo), plus the studio's standard 12% and 25% spreads. The lot follows San Diego's RS-1-7 minimums; the address is fictional, and coverage is modeled at 60% because the city limits floor area (0.60 FAR), not flat-lot coverage." },
} as const satisfies Record<string, LandingDemo>;
export type LandingCity = keyof typeof landingDemos;

export function landingScenarios(city: LandingCity = "seattle") {
  return (["conservative", "market", "optimistic"] as const).map((id) => {
    const result = calculateFeasibility(getParcelById(landingDemos[city].parcelId), defaultAduConfig, { ...defaultFinancialAssumptions, rentScenario: id });
    return { id, costLow: result.costLow, costHigh: result.costHigh, rent: result.monthlyRent, noi: result.annualNoi, payback: result.paybackYears, expenseRatio: result.operatingExpenseRatio, costBreakdown: result.costBreakdown };
  });
}
