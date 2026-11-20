import { expect, it } from "vitest";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets, formatCurrency } from "./feasibility";
import { discloseFeasibility, rentRangeLabel } from "./feasibility-disclosure";

it("returns only the preview when moving from a purchased Lot to a free Lot", () => {
  const [first, second] = parcelPresets.map(parcel => calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions));
  expect(discloseFeasibility(first, true)).toEqual({ unlocked: true, rentLabel: formatCurrency(first.monthlyRent), result: first });
  expect(discloseFeasibility(second, false)).toEqual({ unlocked: false, rentLabel: rentRangeLabel(second) });
});
