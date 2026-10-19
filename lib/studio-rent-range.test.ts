import { expect, it } from "vitest";
import { calculateFeasibility, configForFootprint, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

it.each([[400, 2090, 2613], [600, 2459, 3074], [1000, 3123, 3904]])("exposes the existing scenario endpoints at %i sf", (size, low, high) => {
  for (const rentScenario of ["conservative", "market", "optimistic"] as const) {
    const result = calculateFeasibility(getParcelById("coyote-brush"), configForFootprint(size, defaultAduConfig), { ...defaultFinancialAssumptions, rentScenario });
    expect(result.rentRange).toEqual({ low, high });
  }
});


it.each(["oak-street", "corner-lot", "compact-lot"])("updates the curated %s demo range and financials with bedroom size", (id) => {
  const parcel = getParcelById(id);
  const results = [400, 600, 1000].map((size) => calculateFeasibility(parcel, configForFootprint(size, defaultAduConfig), defaultFinancialAssumptions));
  expect(results[0].rentRange!.low).toBeLessThan(results[1].rentRange!.low);
  expect(results[2].rentRange!.low).toBeGreaterThan(results[1].rentRange!.low);
  expect(results[0].rentRange!.high).toBeLessThan(results[1].rentRange!.high);
  expect(results[2].rentRange!.high).toBeGreaterThan(results[1].rentRange!.high);
  expect(results[1].rentRange).toEqual({ low: parcel.expectedRent.conservative, high: parcel.expectedRent.optimistic });
  for (const result of results) {
    expect(result.monthlyRent).toBe(result.rentRange!.low);
    expect(result.annualNoi).toBe(Math.round(result.monthlyRent * 12 * (1 - result.operatingExpenseRatio)));
    expect(result.market.source).toBe("preset");
    expect(result.market.verified).toBe(false);
  }
  const override = calculateFeasibility(parcel, configForFootprint(400, defaultAduConfig), defaultFinancialAssumptions, { conservative: 1000, market: 1200, optimistic: 1400 });
  expect(override.rentRange).toEqual({ low: 1000, high: 1400 });
});
