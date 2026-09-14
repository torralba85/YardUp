import { describe, expect, it } from "vitest";
import { defaultAduConfig, footprintOptions, parcelPresets } from "./feasibility";
import { getAduPlacementBounds, getDefaultAduPose, getScenePlacement, getSiteFitCapacityStatus } from "./site-fit";
import { buildExistingHouseSceneModel } from "./scene-model";
import { REVIEW_SEPARATION_FT } from "./placement-validation";

describe("getAduPlacementBounds", () => {
  it("uses the rear setback for the negative Z edge and front setback for positive Z", () => {
    const parcel = parcelPresets[0];
    const bounds = getAduPlacementBounds(parcel, defaultAduConfig);

    expect(bounds.minZ).toBe(
      -parcel.lotLength / 2 + parcel.setbacks.rear + defaultAduConfig.length / 2,
    );
    expect(bounds.maxZ).toBe(
      parcel.lotLength / 2 - parcel.setbacks.front - defaultAduConfig.length / 2,
    );
  });

  it("collapses an impossible envelope to a stable midpoint", () => {
    const parcel = { ...parcelPresets[0], lotWidth: 10 };
    const bounds = getAduPlacementBounds(parcel, defaultAduConfig);

    expect(bounds.minX).toBe(bounds.maxX);
    expect(bounds.minX).toBe(0);
  });
});

describe("getSiteFitCapacityStatus", () => {
  it("treats zero remaining capacity as within the modeled allowance", () => {
    expect(getSiteFitCapacityStatus(0)).toMatchObject({
      title: "0 sf of modeled coverage remains",
      tone: "ok",
    });
  });

  it("preserves over-capacity wording when county GIS rules are estimated", () => {
    const parcel = {
      ...parcelPresets[0],
      source: "county-gis",
      zoning: "Unknown",
      existingHouseSqft: 1000,
    };
    expect(getSiteFitCapacityStatus(-380, parcel)).toMatchObject({
      title: "380 sf over assumed coverage allowance",
      tone: "warn",
    });
  });
});

describe("getDefaultAduPose", () => {
  it("does not label unknown or assumed county GIS capacity as clear", () => {
    const parcel = { ...parcelPresets[0], source: "county-gis", zoning: "Unknown", existingHouseSqft: 0 };
    expect(getSiteFitCapacityStatus(1800, parcel)).toMatchObject({ title: "Coverage capacity unknown", tone: "warn" });
    expect(getSiteFitCapacityStatus(800, { ...parcel, existingHouseSqft: 1000 })).toMatchObject({ tone: "warn" });
  });
  it("turns the Seattle ADU to leave a review-free separation from the house", () => {
    // Unturned, the 20x30 ADU gets at most 4 ft behind Seattle's modeled 30x46
    // house. Turned 90° it spans the 30 ft buildable width and gains 10 ft of
    // depth, without changing either declared footprint.
    const parcel = parcelPresets[0];
    const pose = getDefaultAduPose(parcel, defaultAduConfig);
    const placement = getScenePlacement(parcel, defaultAduConfig, pose);

    expect(pose.rotationDeg).toBe(90);
    expect(placement.status).toBe("fits");
    expect(placement.houseClearanceFt).toBeGreaterThanOrEqual(REVIEW_SEPARATION_FT);
    expect(buildExistingHouseSceneModel(parcel).footprint.areaSqft).toBe(parcel.existingHouseSqft);
  });

  it("keeps the entered orientation when it already leaves enough room", () => {
    const pose = getDefaultAduPose(parcelPresets[1], defaultAduConfig);
    expect(pose.rotationDeg).toBe(0);
    expect(getScenePlacement(parcelPresets[1], defaultAduConfig, pose).houseStatus).toBe("clear");
  });

  it("starts at the most room available instead of overlapping the house", () => {
    // Austin's rear yard is exactly as deep as the 30 ft ADU: the old default
    // started 3 ft inside the house. The best pose touches it and says so.
    const parcel = parcelPresets[2];
    const placement = getScenePlacement(parcel, defaultAduConfig, getDefaultAduPose(parcel, defaultAduConfig));
    expect(placement.houseClearanceFt).toBeCloseTo(0, 5);
    expect(placement.status).toBe("review");
  });

  it("stays inside the setback envelope for every preset and size", () => {
    for (const parcel of parcelPresets) {
      for (const option of footprintOptions) {
        const config = { width: option.width, length: option.length };
        expect(getScenePlacement(parcel, config, getDefaultAduPose(parcel, config)).envelopeStatus).toBe("fits");
      }
    }
  });

  it("falls back to the rear-biased position rather than inventing room on a full lot", () => {
    // A lot with no gap either side of the house cannot be satisfied. The pose
    // helper must not fabricate a position outside the envelope; placement
    // validation reports the overlap instead.
    const full = { ...parcelPresets[0], lotLength: 60, existingHouseSqft: 1380 };
    const pose = getDefaultAduPose(full, defaultAduConfig);
    const bounds = getAduPlacementBounds(full, defaultAduConfig);

    expect(pose.z).toBe(Math.min(bounds.minZ + 3, bounds.maxZ));
    expect(getScenePlacement(full, defaultAduConfig, pose).status).not.toBe("fits");
  });
});

describe("getScenePlacement", () => {
  it("measures the roof-edge gap when the roof style is known", () => {
    // Seattle's old default: 3 ft between walls, but the house's 0.8 ft eave
    // and the shed roof's ~0.72 ft length overhang leave under 1.5 ft of air.
    const parcel = parcelPresets[0];
    const house = buildExistingHouseSceneModel(parcel).boundsLocal!;
    const pose = { x: 0, z: house.minZ - 3 - defaultAduConfig.length / 2, rotationDeg: 0 };
    const placement = getScenePlacement(parcel, defaultAduConfig, pose);

    expect(placement.houseClearanceFt).toBeCloseTo(3, 5);
    expect(placement.roofClearanceFt).toBeGreaterThan(1.4);
    expect(placement.roofClearanceFt).toBeLessThan(1.5);
    expect(getScenePlacement(parcel, { width: 20, length: 30 }, pose).roofClearanceFt).toBeNull();
  });
});
