import { describe, expect, it } from "vitest";
import { createAIPropertyInsightsKey } from "./AIPropertyInsightsPanel";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";

describe("createAIPropertyInsightsKey", () => {
  it("changes when config or result values used by parcel insights change", () => {
    const parcel = parcelPresets[0];
    const baseResult = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    const baseKey = createAIPropertyInsightsKey({
      parcel,
      config: defaultAduConfig,
      result: baseResult,
    });

    const configWithoutOpenings = { ...defaultAduConfig, includeOpenings: false };
    const resultWithoutOpenings = calculateFeasibility(
      parcel,
      configWithoutOpenings,
      defaultFinancialAssumptions,
    );
    const openingsKey = createAIPropertyInsightsKey({
      parcel,
      config: configWithoutOpenings,
      result: resultWithoutOpenings,
    });

    const marketAssumptions = { ...defaultFinancialAssumptions, rentScenario: "market" as const };
    const marketResult = calculateFeasibility(parcel, defaultAduConfig, marketAssumptions);
    const marketKey = createAIPropertyInsightsKey({
      parcel,
      config: defaultAduConfig,
      result: marketResult,
    });

    expect(openingsKey).not.toBe(baseKey);
    expect(marketResult.monthlyRent).not.toBe(baseResult.monthlyRent);
    expect(marketKey).not.toBe(baseKey);
  });
});
