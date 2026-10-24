import { describe, expect, it } from "vitest";
import { defaultAduConfig, parcelPresets } from "../../lib/feasibility";
import { evaluateCaliforniaAduRules, residentialZoningCode } from "./californiaAduRules";

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

  it("recognizes California municipal residential zone designations and qualified prefixes", () => {
    for (const code of [
      "R1-1",
      "R1V2",
      "RE9-1",
      "RE11-1",
      "RE15-1",
      "RE20-1",
      "RE40-1",
      "RA-1",
      "RW1",
      "[Q]R2-1",
      "(T)(Q)R3-1",
      "RD1.5-1",
      "RS-1-7",
      "RX-1-1",
      "RT-1-1",
      "RM-1-1",
      "RU-2",
      "RR-1",
      "RMP",
    ]) {
      expect(residentialZoningCode(code), code).toBe("yes");
    }

    for (const nonRes of ["C2-1", "M1-1", "PF-1", "CC-3-3", "IL-2-1"]) {
      expect(residentialZoningCode(nonRes), nonRes).toBe("no");
    }
    expect(residentialZoningCode("Unknown")).toBe("unknown");
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
