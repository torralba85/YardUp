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

  it("names the mapped fire zone in the checklist and the San Diego height line", () => {
    const fire = (zone: string, source = "City of San Diego FHSZ map (2025)") =>
      ({ ...sanDiego, fireHazard: { zone, source, checkedAt: "2026-10-16T00:00:00.000Z" } }) as Parcel;
    const fireLine = (parcel: Parcel) =>
      buildPermitFeeAudit({ parcel, aduSqft: 600, totalHeightFt: 14 }).zoningChecklist.find((line) => line.startsWith("Fire hazard"));

    const veryHigh = buildPermitFeeAudit({ parcel: fire("very-high"), aduSqft: 600, totalHeightFt: 14 });
    expect(fireLine(fire("very-high"))).toBe(
      "Fire hazard severity zone: mapped Very High on the City of San Diego FHSZ map (2025); expect ignition-resistant materials, defensible space and fire access review",
    );
    expect(veryHigh.feeLines.at(-1)).toEqual({
      title: "Height: 16 ft or less, in a fire hazard zone",
      detail: "Modeled height is 14 ft. This lot is mapped Very High on the City of San Diego FHSZ map (2025), so San Diego requires 4 ft side and rear setbacks at any height.",
      tone: "review",
    });
    expect(fireLine(fire("none", "CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)"))).toBe(
      "Fire hazard severity zone: none mapped at this lot on the CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024); confirm with the fire department",
    );
    expect(buildPermitFeeAudit({ parcel: fire("none"), aduSqft: 600, totalHeightFt: 14 }).feeLines.at(-1)?.tone).toBe("clear");

    const generic = "Fire hazard severity zone mapping: it can change setbacks, materials and access";
    expect(fireLine(fire("unknown"))).toBe(generic);
    expect(fireLine(sanDiego)).toBe(generic);
    expect(fireLine({ ...base, fireHazard: { zone: "moderate", source: "CAL FIRE LRA FHSZ map (2025)", checkedAt: "" } } as Parcel))
      .toBe("Fire hazard severity zone: mapped Moderate on the CAL FIRE LRA FHSZ map (2025); ask the fire department which material and defensible-space rules apply");
  });

  it("does not call San Diego's zero-setback height line clear while the fire zone is unchecked", () => {
    const withFire = (fireHazard?: { zone: string; source: string; checkedAt: string }) =>
      ({ ...sanDiego, ...(fireHazard ? { fireHazard } : {}) }) as Parcel;
    const heightLine = (parcel: Parcel, totalHeightFt = 14) =>
      buildPermitFeeAudit({ parcel, aduSqft: 600, totalHeightFt }).feeLines.at(-1);
    const checked = (zone: string) => withFire({ zone, source: "City of San Diego FHSZ map (2025)", checkedAt: "2026-10-16T00:00:00.000Z" });

    for (const parcel of [withFire(), checked("unknown")]) {
      const line = heightLine(parcel);
      expect(line?.title).toBe("Height: 16 ft or less, fire zone not checked");
      expect(line?.tone).toBe("review");
      expect(line?.detail).toContain("4 ft side and rear setbacks");
      expect(line?.detail).not.toContain("needs no side or rear setback");
    }
    // A zone the maps actually cleared keeps the zero-setback line.
    for (const zone of ["none", "moderate"]) {
      expect(heightLine(checked(zone))).toMatchObject({ title: "Height: 16 ft or less", tone: "clear" });
    }
    // Taller layouts are already a review item whether or not the zone was checked.
    expect(heightLine(withFire(), 18)?.title).toBe("Height: over San Diego's 16 ft line");
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

describe("permitting jurisdiction", () => {
  const checkedAt = "2026-11-21T00:00:00.000Z";
  const county = (community?: string) => ({
    ...sanDiego,
    city: "San Diego, CA 92127",
    permitAuthority: { kind: "county", name: "San Diego", ...(community ? { community } : {}), basis: "parcel-record", checkedAt },
  }) as Parcel;

  it("prefers the resolved jurisdiction over the mailing-address city", () => {
    expect(feeJurisdiction(county())).toBe("san-diego-county");
    expect(feeJurisdiction({ ...base, state: "CA", permitAuthority: { kind: "city", name: "San Diego", basis: "place-boundary", checkedAt } } as Parcel)).toBe("san-diego");
    expect(feeJurisdiction({ ...sanDiego, permitAuthority: { kind: "county", name: "Riverside", basis: "place-boundary", checkedAt } } as Parcel)).toBe("california");
    // Without a resolved jurisdiction the mailing city still decides, as before.
    expect(feeJurisdiction(sanDiego)).toBe("san-diego");
  });

  it("keeps California rules outside California whatever the lookup says", () => {
    expect(feeJurisdiction({ ...parcelPresets[0], permitAuthority: { kind: "county", name: "San Diego", basis: "parcel-record", checkedAt } } as Parcel)).toBe("other");
  });

  it("gives a County lot the County lines and none of the City's", () => {
    const audit = buildPermitFeeAudit({ parcel: county("Spring Valley"), aduSqft: 600 });
    const titles = audit.feeLines.map((line) => line.title);
    expect(audit.jurisdiction).toBe("san-diego-county");
    expect(titles).toContain("Permit: unincorporated San Diego County");
    expect(titles).toContain("Green Building Incentive Program: up to 15% off County permit fees");
    expect(titles).toContain("County fees: the ADU fee waiver has ended");
    expect(titles).not.toContain("City of San Diego: first two ADUs exempt from DIF");
    expect(audit.feeLines.find((line) => line.title.startsWith("Permit:"))?.detail).toMatch(/outside city limits, in Spring Valley/);
    expect(audit.zoningChecklist[0]).toMatch(/outside city limits/);
    expect(audit.zoningChecklist.join(" ")).not.toMatch(/0 ft up to 16 ft/);
    expect(audit.submittalChecklist.join(" ")).toMatch(/PDS 658/);
    expect(audit.sources.map((source) => source.url)).toEqual(expect.arrayContaining([
      "https://www.sandiegocounty.gov/content/sdc/pds/greenbuildings.html",
      expect.stringMatching(/\/adu\/ca\/san-diego-county$/),
    ]));
    expect(audit.sources.map((source) => source.url).join(" ")).not.toMatch(/sandiego\.gov/);
  });

  it("names the County's receipt for school fees, and previews the County analysis", () => {
    const audit = buildPermitFeeAudit({ parcel: county(), aduSqft: 700 });
    expect(audit.feeLines.find((line) => line.title.startsWith("School"))?.detail).toMatch(/The County needs/);
    expect(permitAuditPreviewLines("san-diego-county").join(" ")).toMatch(/Green Building/);
    expect(permitAuditTitle("san-diego-county")).toBe("750 sq ft impact-fee & permit audit");
  });
});
