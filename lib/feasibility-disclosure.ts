import { formatCurrency, type FeasibilityResult } from "./feasibility";

export function rentRangeLabel(result: FeasibilityResult) {
  return result.rentRange
    ? `${formatCurrency(result.rentRange.low)}–${formatCurrency(result.rentRange.high)}`
    : formatCurrency(result.monthlyRent);
}

/** Figures the active Lot can display for its current Certificate access. */
export function discloseFeasibility(result: FeasibilityResult, unlocked: boolean) {
  if (unlocked) {
    return { unlocked: true as const, rentLabel: formatCurrency(result.monthlyRent), result };
  }
  return { unlocked: false as const, rentLabel: rentRangeLabel(result) };
}
