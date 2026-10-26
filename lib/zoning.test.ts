import { describe, expect, it } from "vitest";
import { calculateZoning } from "./zoning";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
} from "./feasibility";
import { getSiteFitCapacityStatus } from "./site-fit";
import { summarizeFeasibility } from "./feasibility-verdict";

describe("calculateZoning", () => {
  it.each(["C-2", "M-1", "I-1", "PD"])("requires review for a legacy live parcel zoned %s", (zoning) => {
    const parcel = { ...getParcelById("oak-street"), source: "regrid" as const, zoning };
    expect(calculateZoning(parcel, defaultAduConfig).zoningStatus).toBe("Review needed");
  });

  it("does not calculate an overage warning from a borrowed house footprint", () => {
    const parcel = { ...getParcelById("oak-street"), source: "fallback" as const, existingHouseSqft: 5000 };
    const result = calculateZoning(parcel, defaultAduConfig);

    expect(result.footprintKnown).toBe(false);
    expect(result.warnings.some((warning) => /footprint is unknown/i.test(warning))).toBe(true);
    expect(result.warnings.some((warning) => /Footprint exceeds/i.test(warning))).toBe(false);
  });

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

describe("California's 800 sq ft ADU protection (Gov. Code § 66321(b)(3))", () => {
  // 40% of 7,297 sf is 2,919 sf, which leaves 569 sf beside a 2,350 sf house.
  const lot = {
    ...getParcelById("oak-street"),
    city: "Morgan Hill, CA 95037",
    lotArea: 7297,
    existingHouseSqft: 2350,
    maxLotCoveragePercent: 40,
  };

  it("lets a 600 sf ADU through a coverage limit that leaves 569 sf", () => {
    const result = calculateZoning(lot, configForFootprint(600, defaultAduConfig));
    expect(result.capacityBasis).toBe("california-800");
    expect(result.coveragePercent).toBeGreaterThan(40);
    expect(result.remainingCapacity).toBe(200);
    expect(result.zoningStatus).toBe("Compliant");
    expect(result.warnings).toHaveLength(0);
  });

  it("protects exactly 800 sf", () => {
    const result = calculateZoning(lot, configForFootprint(800, defaultAduConfig));
    expect(result.remainingCapacity).toBe(0);
    expect(result.zoningStatus).toBe("Compliant");
  });

  it("flags the part of a larger ADU above 800 sf", () => {
    const result = calculateZoning(lot, configForFootprint(1000, defaultAduConfig));
    expect(result.remainingCapacity).toBe(-200);
    expect(result.zoningStatus).toBe("Review needed");
    expect(result.warnings).toContain("Footprint is 200 sf over the 800 sf that California protects from local coverage limits.");
  });

  it("keeps the coverage limit when it allows more than 800 sf", () => {
    const result = calculateZoning({ ...lot, existingHouseSqft: 1000 }, configForFootprint(600, defaultAduConfig));
    expect(result.capacityBasis).toBe("coverage");
    expect(result.remainingCapacity).toBe(2919 - 1600);
  });

  it("leaves lots outside California on the coverage limit", () => {
    const result = calculateZoning({ ...lot, city: "Seattle, WA 98115" }, configForFootprint(600, defaultAduConfig));
    expect(result.capacityBasis).toBe("coverage");
    expect(result.remainingCapacity).toBe(-31);
    expect(result.warnings).toContain("Footprint exceeds local coverage allowance by 31 sf.");
  });

  it("explains the protection in the site-fit status and the verdict rows", () => {
    const config = configForFootprint(600, defaultAduConfig);
    const result = calculateFeasibility(lot, config, defaultFinancialAssumptions);
    expect(getSiteFitCapacityStatus(result.remainingCapacity, lot, result.capacityBasis)).toMatchObject({
      title: "200 sf of room under California's 800 sf ADU protection",
      tone: "ok",
    });
    expect(getSiteFitCapacityStatus(-200, lot, "california-800").title).toBe("200 sf over California's 800 sf ADU protection");
    const rows = summarizeFeasibility(lot, result, config).constraints;
    expect(rows.find((row) => row.id === "coverage")).toMatchObject({
      status: "clear",
      detail: "Over the limit, but California doesn't let coverage block an ADU up to 800 sf (Gov. Code § 66321(b)(3))",
    });
    expect(rows.find((row) => row.id === "capacity")?.detail).toBe("Room up to the 800 sf California protects from lot-coverage limits");
  });
});
