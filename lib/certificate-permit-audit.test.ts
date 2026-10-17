import { describe, expect, it } from "vitest";
import {
  assessImpactFeeThreshold,
  buildPermitFeeAudit,
  feeJurisdiction,
  permitAuditPreviewLines,
  permitAuditTitle,
  proportionalFeeSharePercent,
} from "./certificate-permit-audit";
import { parcelPresets, type Parcel } from "./feasibility";

const base: Parcel = {
  address: "1 Test Street",
  city: "Oceanside, CA 92054",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 20, rear: 4, side: 4 },
};
const sanDiego = { ...base, city: "San Diego", state: "CA" } as Parcel;

describe("assessImpactFeeThreshold", () => {
  it("exempts 749 sq ft with 1 sq ft of headroom", () => {
    expect(assessImpactFeeThreshold(749)).toEqual({
      sqft: 749, limitSqft: 750, isExempt: true, sqftOverLimit: 0, sqftUnderLimit: 1,
    });
  });

  it("exempts exactly 750 sq ft, as the HCD handbook's \"750 or less\" reads", () => {
    expect(assessImpactFeeThreshold(750)).toEqual({
      sqft: 750, limitSqft: 750, isExempt: true, sqftOverLimit: 0, sqftUnderLimit: 0,
    });
  });

  it("flags anything over 750 sq ft with the footprint to trim", () => {
    expect(assessImpactFeeThreshold(751)).toMatchObject({ isExempt: false, sqftOverLimit: 1 });
    expect(assessImpactFeeThreshold(750.2)).toMatchObject({ isExempt: false, sqftOverLimit: 1 });
    expect(assessImpactFeeThreshold(751.2)).toMatchObject({ isExempt: false, sqftOverLimit: 2 });
    expect(assessImpactFeeThreshold(800)).toEqual({
      sqft: 800, limitSqft: 750, isExempt: false, sqftOverLimit: 50, sqftUnderLimit: 0,
    });
  });
});

describe("feeJurisdiction", () => {
  it("reads the state field first, then the city line", () => {
    expect(feeJurisdiction(sanDiego)).toBe("san-diego");
    expect(feeJurisdiction({ ...base, city: "San Diego, CA 92103" })).toBe("san-diego");
    expect(feeJurisdiction({ ...base, city: "Oceanside", state: "ca" } as Parcel)).toBe("california");
    expect(feeJurisdiction({ ...base, city: "Chula Vista, California" })).toBe("california");
  });

  it("keeps California rules off other states and unknown locations", () => {
    expect(feeJurisdiction(parcelPresets[0])).toBe("other");
    expect(feeJurisdiction({ ...base, city: "San Diego", state: "TX" } as Parcel)).toBe("other");
    expect(feeJurisdiction({ ...base, city: "San Diego" })).toBe("other");
  });
});

describe("proportionalFeeSharePercent", () => {
  it("scales the fee by the ADU's size against the main house", () => {
    expect(proportionalFeeSharePercent(800, 1600)).toBe(50);
    expect(proportionalFeeSharePercent(1000, 1380)).toBe(72);
  });

  it("names no share when the main house size is unknown", () => {
    expect(proportionalFeeSharePercent(800, 0)).toBeNull();
  });
});

describe("buildPermitFeeAudit", () => {
  it("records the exemption for a California layout at the limit", () => {
    const audit = buildPermitFeeAudit({ parcel: base, aduSqft: 750, totalHeightFt: 14 });
    expect(audit.title).toBe("750 sq ft impact-fee & permit audit");
    expect(audit.feeLines[0]).toMatchObject({ title: "Impact fees: exempt under state law", tone: "clear" });
    expect(audit.feeLines.at(-1)).toMatchObject({ title: "Height: within the state minimum", tone: "clear" });
    expect(audit.sources[0].label).toMatch(/HCD ADU Handbook/);
  });

  it("prices the proportional fee and the trim that avoids it over the limit", () => {
    const audit = buildPermitFeeAudit({ parcel: base, aduSqft: 800, totalHeightFt: 17.5 });
    const impact = audit.feeLines[0];
    expect(impact.title).toBe("Impact fees: 50 sq ft over the exemption");
    expect(impact.tone).toBe("review");
    expect(impact.detail).toMatch(/about 50% of the fee for a new home its size/);
    expect(impact.detail).toMatch(/Trimming 50 sq ft of footprint keeps the layout within the exemption/);
    expect(impact.detail).toMatch(/interior livable space/);
    expect(audit.feeLines.find((line) => line.title.startsWith("School"))?.tone).toBe("review");
    expect(audit.feeLines.at(-1)).toMatchObject({ title: "Height: above the 16 ft state minimum", tone: "review" });
  });

  it("exempts school fees only under 500 sq ft", () => {
    const school = (sqft: number) =>
      buildPermitFeeAudit({ parcel: base, aduSqft: sqft }).feeLines.find((line) => line.title.startsWith("School"));
    expect(school(499)?.title).toBe("School district fees: exempt");
    expect(school(500)?.title).toBe("School district fees: expect them");
  });

  it("adds the City of San Diego DIF exemption, height setbacks and sources", () => {
    const audit = buildPermitFeeAudit({ parcel: sanDiego, aduSqft: 900, totalHeightFt: 18 });
    expect(audit.feeLines.map((line) => line.title)).toContain("City of San Diego: first two ADUs exempt from DIF");
    expect(audit.feeLines.at(-1)?.title).toBe("Height: over San Diego's 16 ft line");
    expect(audit.submittalChecklist[0]).toMatch(/Information Bulletin 400/);
    expect(audit.sources.map((source) => source.url)).toContain(
      "https://www.sandiego.gov/planning/work/public-spaces/faq",
    );
  });

  it("leaves height out when it is unknown", () => {
    const audit = buildPermitFeeAudit({ parcel: base, aduSqft: 600, totalHeightFt: null });
    expect(audit.feeLines.some((line) => line.title.startsWith("Height"))).toBe(false);
  });

  it("drops the main-house share when the footprint is unknown", () => {
    const unknown = { ...base, source: "county-gis", state: "CA", existingHouseSqft: 0 } as Parcel;
    const impact = buildPermitFeeAudit({ parcel: unknown, aduSqft: 800 }).feeLines[0];
    expect(impact.detail).toMatch(/proportional to the size of the main house/);
    expect(impact.detail).not.toMatch(/%/);
  });

  it("applies no California rules outside California", () => {
    const audit = buildPermitFeeAudit({ parcel: parcelPresets[0], aduSqft: 800, totalHeightFt: 20 });
    expect(audit.jurisdiction).toBe("other");
    expect(audit.title).toBe("Permit fee & submittal audit");
    const text = JSON.stringify(audit);
    expect(text).not.toMatch(/SB 13|Title 24|San Diego/);
    expect(audit.sources).toEqual([]);
  });
});

describe("permit audit labels", () => {
  it("names the 750 sq ft audit only where the rule applies", () => {
    expect(permitAuditTitle("other")).toBe("Permit fee & submittal audit");
    expect(permitAuditPreviewLines("san-diego")[0]).toMatch(/City of San Diego/);
    expect(permitAuditPreviewLines("california")[1]).toMatch(/^California counter submittal checklist/);
    expect(permitAuditPreviewLines("other").join(" ")).not.toMatch(/SB 13|Title 24/);
  });
});
