import { describe, expect, it } from "vitest";
import { calculateZoning } from "./zoning";
import { defaultAduConfig, getParcelById, configForFootprint } from "./feasibility";

describe("calculateZoning", () => {
  it("treats the default 600 sf concept as compliant on the typical lot", () => {
    const parcel = getParcelById("oak-street");
    const result = calculateZoning(parcel, defaultAduConfig);

    expect(result.aduSqft).toBe(600);
    expect(result.zoningStatus).toBe("Compliant");
    expect(result.remainingCapacity).toBeGreaterThanOrEqual(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags a 1,000 sf concept on the compact lot as review needed", () => {
    const parcel = getParcelById("compact-lot");
    const enlarged = configForFootprint(1000, defaultAduConfig);
    const result = calculateZoning(parcel, enlarged);

    expect(result.aduSqft).toBe(1000);
    expect(result.zoningStatus).toBe("Review needed");
    expect(result.warnings[0]).toMatch(/coverage allowance/i);
  });

  it("warns when ADU height exceeds the 16 ft review threshold", () => {
    const parcel = getParcelById("oak-street");

    // At the 16 ft threshold there is no height warning (guards the `>` boundary).
    const atThreshold = calculateZoning(parcel, { ...defaultAduConfig, height: 16 });
    expect(atThreshold.warnings.some((warning) => /height/i.test(warning))).toBe(false);

    // Above it the review warning appears, and it is independent of coverage:
    // a compliant lot still surfaces it.
    const overThreshold = calculateZoning(parcel, { ...defaultAduConfig, height: 20 });
    expect(overThreshold.warnings.some((warning) => /height/i.test(warning))).toBe(true);
    expect(overThreshold.zoningStatus).toBe("Compliant");
  });
});
