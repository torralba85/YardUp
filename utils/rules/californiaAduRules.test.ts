import { describe, expect, it } from "vitest";
import { defaultAduConfig, parcelPresets } from "../../lib/feasibility";
import { evaluateCaliforniaAduRules } from "./californiaAduRules";

describe("evaluateCaliforniaAduRules", () => {
  it("qualifies a residential California concept at 800 sf or less", () => {
    const parcel = {
      ...parcelPresets[0],
      city: "San Diego, CA 92101",
      state: "CA",
      zoning: "R-1",
    };
    const result = evaluateCaliforniaAduRules({
      parcel,
      config: { ...defaultAduConfig, footprint: 800, width: 25, length: 32 },
      transitDistanceMiles: 0.4,
    });

    expect(result.status).toBe("qualified");
    expect(result.footprintProtected).toBe(true);
    expect(result.parkingWaiverEligible).toBe(true);
  });

  it("keeps transit eligibility unknown when no verified distance exists", () => {
    const parcel = {
      ...parcelPresets[0],
      city: "Los Angeles, CA 90012",
      state: "CA",
      zoning: "R-2",
    };
    expect(evaluateCaliforniaAduRules({ parcel, config: defaultAduConfig }).parkingWaiverEligible).toBeNull();
  });

  it("does not apply the California screen outside California", () => {
    expect(
      evaluateCaliforniaAduRules({ parcel: parcelPresets[0], config: defaultAduConfig }).status,
    ).toBe("not-applicable");
  });
});
