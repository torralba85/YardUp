import { describe, expect, it } from "vitest";
import { defaultAduConfig } from "./feasibility";
import type { LiveParcelData } from "./parcel-types";
import { buildExistingHouseSceneModel, buildParcelOutline, buildSceneOrigin } from "./scene-model";
import { rectPolygon } from "./scene-model-fixtures";
import { getScenePlacement, getSnapToFitPose } from "./site-fit";
import { normalizeLiveParcel } from "./saved-scenarios";
import { SAMPLE_LIVE_PARCEL } from "../test/fixtures/live-parcel";

const parcel: LiveParcelData = {
  ...SAMPLE_LIVE_PARCEL,
  lotWidth: 80,
  lotLength: 140,
  lotArea: 11200,
  existingHouseSqft: 800,
  boundaryGeoJson: rectPolygon(SAMPLE_LIVE_PARCEL.lat, SAMPLE_LIVE_PARCEL.lng, 80, 140, 35),
  bearingDeg: 35,
  existingBuilding: {
    outlineGeoJson: rectPolygon(SAMPLE_LIVE_PARCEL.lat, SAMPLE_LIVE_PARCEL.lng, 20, 40, 35),
    detachedOutlinesGeoJson: [rectPolygon(SAMPLE_LIVE_PARCEL.lat, SAMPLE_LIVE_PARCEL.lng, 60, 70, 35)],
    roofPitchDegrees: 20,
    geometrySource: "usa-structures",
  },
};

describe("restored rectangular parcel model", () => {
  it("uses the same area-preserving house and lot frame even for studies saved with observed geometry", () => {
    const saved = normalizeLiveParcel(parcel)!;
    expect(saved.existingBuilding).toBeDefined();
    const house = buildExistingHouseSceneModel(saved);
    expect(house.footprint.width! * house.footprint.depth!).toBeCloseTo(800);
    expect(house.pose!.rotationDeg).toBe(0);
    expect(house.pose!.z).toBeCloseTo(70 - saved.setbacks.front - house.footprint.depth! / 2);
    expect(buildSceneOrigin(saved).bearingDeg).toBeNull();
    expect(buildParcelOutline(saved)).toMatchObject({ width: 80, length: 140, isProxy: true });
  });

  it("snaps an overlapping ADU clear of the same house the renderer draws", () => {
    const house = buildExistingHouseSceneModel(parcel);
    const overlapping = { ...house.pose! };
    expect(getScenePlacement(parcel, defaultAduConfig, overlapping).houseStatus).toBe("overlap");
    const snapped = getSnapToFitPose(parcel, defaultAduConfig, overlapping);
    expect(snapped).not.toBeNull();
    const placement = getScenePlacement(parcel, defaultAduConfig, snapped!);
    expect(placement.status).toBe("fits");
    expect(placement.houseClearanceFt).toBeGreaterThanOrEqual(9.99);
    expect(placement.roofClearanceFt).toBeGreaterThan(0);
  });
});
