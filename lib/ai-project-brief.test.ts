import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "./feasibility";
import { buildAIProjectBriefInput, createAIProjectBriefKey } from "./ai-project-brief";

describe("AI project brief input", () => {
  it("changes identity when parcel, design, or financial results change", () => {
    const parcel = parcelPresets[0];
    const baseResult = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    const base = { parcel, config: defaultAduConfig, result: baseResult };

    const marketAssumptions = {
      ...defaultFinancialAssumptions,
      rentScenario: "market" as const,
    };
    const marketResult = calculateFeasibility(parcel, defaultAduConfig, marketAssumptions);
    const largerConfig = { ...defaultAduConfig, footprint: 800, width: 25, length: 32 };
    const largerResult = calculateFeasibility(parcel, largerConfig, defaultFinancialAssumptions);

    expect(createAIProjectBriefKey(base)).not.toBe(
      createAIProjectBriefKey({ ...base, result: marketResult }),
    );
    expect(createAIProjectBriefKey(base)).not.toBe(
      createAIProjectBriefKey({ parcel, config: largerConfig, result: largerResult }),
    );
    expect(createAIProjectBriefKey(base)).not.toBe(
      createAIProjectBriefKey({
        ...base,
        parcel: { ...parcel, address: "88 Cedar Avenue" },
      }),
    );
  });

  it("selects one combined payload with parcel, feasibility, and timeline inputs", () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    const input = buildAIProjectBriefInput({ parcel, result, config: defaultAduConfig });

    expect(input.parcel.address).toBe(parcel.address);
    expect(input.config).toMatchObject({ footprint: 600, width: 20, length: 30 });
    expect(input.result).toMatchObject({
      monthlyRent: result.monthlyRent,
      zoningStatus: result.zoningStatus,
      warnings: result.warnings,
    });
  });
});
