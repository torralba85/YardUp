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

  it("strips live parcel geometry and preset extras from the payload", () => {
    const preset = parcelPresets[0];
    const liveParcel = {
      ...preset,
      zoning: "R-1",
      source: "regrid",
      boundaryGeoJson: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-122.3, 47.6],
            [-122.3, 47.601],
            [-122.299, 47.601],
            [-122.3, 47.6],
          ],
        ],
      },
      lat: 47.6,
      lng: -122.3,
    };
    const result = calculateFeasibility(
      liveParcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );

    const input = buildAIProjectBriefInput({
      parcel: liveParcel,
      result,
      config: defaultAduConfig,
    });

    expect(input.parcel).not.toHaveProperty("boundaryGeoJson");
    expect(input.parcel).not.toHaveProperty("lat");
    expect(input.parcel).not.toHaveProperty("lng");
    expect(input.parcel).not.toHaveProperty("expectedRent");
    expect(input.parcel.zoning).toBe("R-1");
    expect(input.parcel.source).toBe("regrid");
    expect(input.parcel.setbacks).toEqual(preset.setbacks);
  });
});
