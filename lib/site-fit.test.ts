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
});

describe("getDefaultAduPose", () => {
  it("steps a new ADU clear of the modeled existing house", () => {
    // Oak Street's 1,380 sf house models as a 19.5 x 70.8 ft footprint spanning
    // most of the lot's length, so the old rear-biased default started the ADU
    // inside it. That default only ever looked reasonable because the renderer
    // drew a much smaller house than the recorded area (D1).
    const parcel = parcelPresets[0];
    const pose = getDefaultAduPose(parcel, defaultAduConfig);
    const house = buildExistingHouseSceneModel(parcel).boundsLocal!;
    const halfLength = defaultAduConfig.length / 2;

    expect(pose.z - halfLength >= house.maxZ || pose.z + halfLength <= house.minZ).toBe(true);
    expect(getScenePlacement(parcel, defaultAduConfig, pose).status).toBe("fits");
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
