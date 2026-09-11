import { describe, expect, it } from "vitest";
import { defaultAduConfig, parcelPresets } from "./feasibility";
import { getAduPlacementBounds, getDefaultAduPose, getScenePlacement, getSiteFitCapacityStatus } from "./site-fit";
import { buildExistingHouseSceneModel } from "./scene-model";

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
  it("steps a new ADU clear of the modeled existing house", () => {
    // The Seattle house and ADU must retain their declared footprints while
    // leaving a usable separation inside the actual setback envelope.
    const parcel = parcelPresets[0];
    const pose = getDefaultAduPose(parcel, defaultAduConfig);
    const house = buildExistingHouseSceneModel(parcel).boundsLocal!;
    const halfLength = defaultAduConfig.length / 2;

    expect(pose.z - halfLength >= house.maxZ || pose.z + halfLength <= house.minZ).toBe(true);
    expect(getScenePlacement(parcel, defaultAduConfig, pose).status).toBe("fits");
    expect(pose.z + halfLength).toBeLessThanOrEqual(house.minZ - 3);
  });

  it("stays inside the setback envelope", () => {
    for (const parcel of parcelPresets) {
      const pose = getDefaultAduPose(parcel, defaultAduConfig);
      const bounds = getAduPlacementBounds(parcel, defaultAduConfig);
      expect(pose.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(pose.z).toBeLessThanOrEqual(bounds.maxZ);
      expect(pose.rotationDeg).toBe(0);
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
