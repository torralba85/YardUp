import { expect, it } from "vitest";
import { calculateFeasibility, configForFootprint, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";

it.each([[400, 2090, 2613], [600, 2459, 3074], [1000, 3123, 3904]])("exposes the existing scenario endpoints at %i sf", (size, low, high) => {
  for (const rentScenario of ["conservative", "market", "optimistic"] as const) {
    const result = calculateFeasibility(getParcelById("coyote-brush"), configForFootprint(size, defaultAduConfig), { ...defaultFinancialAssumptions, rentScenario });
    expect(result.rentRange).toEqual({ low, high });
  }
});
