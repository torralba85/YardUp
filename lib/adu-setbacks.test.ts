import { describe, expect, it } from "vitest";
import {
  aduSetbackNote,
  aduSetbacks,
  CALIFORNIA_ADU_SIDE_REAR_CAP_FT,
  SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT,
  withAduSetbacks,
} from "./adu-setbacks";
import { defaultAduConfig, parcelPresets, type ADUConfig, type Parcel } from "./feasibility";
import { buildAduHeightModel } from "./scene-model";
import { getAduPlacementBounds, getScenePlacement } from "./scene-placement";
import { buildableArea, summarizeFeasibility } from "./feasibility-verdict";

// The fallback a live California lookup gets when no zoning setbacks are published.
const california: Parcel = {
  address: "1 Test Street",
  city: "Oceanside, CA 92054",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 20, rear: 20, side: 5 },
};
// Checked against the fire maps and outside every zone: the case that earns 0 ft.
// Fire-zone and unchecked lots are covered in adu-setbacks.fire-zones.test.ts.
const sanDiego = {
  ...california,
  city: "San Diego",
  state: "CA",
  fireHazard: { zone: "none", source: "CAL FIRE LRA 2025; City of San Diego", checkedAt: "2026-10-16T00:00:00Z" },
} as Parcel;
const seattle = parcelPresets[0];

const low: ADUConfig = { ...defaultAduConfig, height: 9, roof: "flat" };
const tall: ADUConfig = { ...defaultAduConfig, height: 16, roof: "gable" };

describe("aduSetbacks", () => {
  it("test configs straddle San Diego's 16 ft line", () => {
    expect(buildAduHeightModel(low)!.totalHeight).toBeLessThanOrEqual(SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT);
    expect(buildAduHeightModel(tall)!.totalHeight).toBeGreaterThan(SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT);
  });

  it("keeps the parcel's own setbacks outside California", () => {
    expect(seattle.city).toMatch(/WA/);
    expect(aduSetbacks(seattle, low)).toEqual({ ...seattle.setbacks, rule: "parcel" });
    expect(aduSetbackNote("parcel")).toBeNull();
  });

  it("caps side and rear at 4 ft in California and keeps the front setback", () => {
    expect(aduSetbacks(california, low)).toEqual({ front: 20, rear: 4, side: 4, rule: "california" });
    expect(CALIFORNIA_ADU_SIDE_REAR_CAP_FT).toBe(4);
    expect(aduSetbackNote("california")).toBe("California caps ADU side and rear setbacks at 4 ft.");
  });

  it("never raises a California setback that is already under the cap", () => {
    const tight = { ...california, setbacks: { front: 15, rear: 3, side: 2 } };
    expect(aduSetbacks(tight, low)).toEqual({ front: 15, rear: 3, side: 2, rule: "california" });
  });

  it("drops side and rear to 0 ft in the City of San Diego at 16 ft or less", () => {
    expect(aduSetbacks(sanDiego, low)).toEqual({ front: 20, rear: 0, side: 0, rule: "san-diego-low" });
    expect(aduSetbackNote("san-diego-low")).toMatch(/outside High and Very High fire hazard zones, and this lot is outside them/);
  });

  it("uses 4 ft in the City of San Diego over 16 ft", () => {
    expect(aduSetbacks(sanDiego, tall)).toEqual({ front: 20, rear: 4, side: 4, rule: "san-diego-tall" });
  });

  it("falls back to the 4 ft cap in San Diego when the height is unknown", () => {
    expect(aduSetbacks(sanDiego)).toEqual({ front: 20, rear: 4, side: 4, rule: "california" });
    expect(aduSetbacks(sanDiego, { width: 20, length: 30 })).toMatchObject({ rule: "california" });
  });

  it("reads the state from the city line when the parcel has no state field", () => {
    expect(aduSetbacks({ ...california, city: "Morgan Hill, CA 95037" }, low)).toMatchObject({ rule: "california" });
  });

  it("swaps only the setbacks with withAduSetbacks", () => {
    const swapped = withAduSetbacks(california, low);
    expect(swapped.setbacks).toEqual({ front: 20, rear: 4, side: 4 });
    expect({ ...swapped, setbacks: california.setbacks }).toEqual(california);
    expect(california.setbacks).toEqual({ front: 20, rear: 20, side: 5 });
  });
});

describe("ADU setbacks in placement and the verdict", () => {
  it("lets a California backyard home sit 4 ft from the rear line", () => {
    const bounds = getAduPlacementBounds(california, low);
    expect(bounds.minZ).toBe(-california.lotLength / 2 + 4 + low.length / 2);
    expect(bounds.minX).toBe(-california.lotWidth / 2 + 4 + low.width / 2);
  });

  it("validates a rear-corner pose against the ADU envelope, not the house's", () => {
    const corner = {
      x: -sanDiego.lotWidth / 2 + low.width / 2,
      z: -sanDiego.lotLength / 2 + low.length / 2,
      rotationDeg: 0,
    };
    expect(getScenePlacement(sanDiego, low, corner).envelopeStatus).toBe("fits");
    expect(getScenePlacement(sanDiego, tall, corner).envelopeStatus).toBe("overflow");
    expect(getScenePlacement(california, low, corner).envelopeStatus).toBe("overflow");
    expect(
      getScenePlacement(california, low, { ...corner, x: corner.x + 4, z: corner.z + 4 }).envelopeStatus,
    ).toBe("fits");
  });

  it("measures buildable area with the ADU setbacks", () => {
    expect(buildableArea(california, low)).toBe((50 - 8) * (120 - 20 - 4));
    expect(buildableArea(sanDiego, low)).toBe(50 * 100);
    expect(buildableArea(seattle, low)).toBe(
      (seattle.lotWidth - seattle.setbacks.side * 2) * (seattle.lotLength - seattle.setbacks.front - seattle.setbacks.rear),
    );
  });

  it("names the rule in the verdict's setback row", () => {
    const result = { remainingCapacity: 100, zoningStatus: "Compliant", aduSqft: 600, coveragePercent: 30, maxCoveragePercent: 50, warnings: [] };
    const row = summarizeFeasibility(california, result as never, low).constraints.find((c) => c.id === "buildable");
    expect(row?.detail).toBe("4′ side · 20′ front · 4′ rear. California caps ADU side and rear setbacks at 4 ft");
  });
});
