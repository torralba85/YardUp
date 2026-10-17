import { describe, expect, it } from "vitest";
import { defaultAduConfig, parcelPresets } from "./feasibility";
import {
  buildAduFootprint, buildExistingHouseSceneModel,
  projectGeodeticToLocal, projectLocalToGeodetic, projectPolygonToLocal,
} from "./scene-model";
import { FT_PER_DEG_LAT } from "./parcel-geometry";

describe("T01 independent review of geographic and invalid-input contracts", () => {
  const origin = { lat: 0, lng: 0 };
  it("maps east to positive local z when the z-axis bearing is 90 degrees", () => {
    const local = projectGeodeticToLocal(origin, 90, { lat: 0, lng: 100 / FT_PER_DEG_LAT });
    expect(local?.x).toBeCloseTo(0, 8);
    expect(local?.z).toBeCloseTo(100, 8);
    const geographic = projectLocalToGeodetic(origin, 90, { x: 0, z: 100 });
    expect(geographic?.lat).toBeCloseTo(0, 8);
    expect(geographic?.lng).toBeCloseTo(100 / FT_PER_DEG_LAT, 8);
  });
  it("cannot imply scene alignment without a known finite bearing", () => {
    for (const bearing of [null, NaN, Infinity]) {
      expect(projectGeodeticToLocal(origin, bearing, origin)).toBeNull();
      expect(projectLocalToGeodetic(origin, bearing, { x: 0, z: 0 })).toBeNull();
    }
  });
  it("rejects undefined polar longitude and unrepresentable inverse coordinates", () => {
    expect(projectLocalToGeodetic({ lat: 90, lng: 0 }, 0, { x: 100, z: 0 })).toBeNull();
    expect(projectLocalToGeodetic(origin, 0, { x: 0, z: FT_PER_DEG_LAT * 91 })).toBeNull();
  });
  it("does not silently discard holes when only one ring can be returned", () => {
    expect(projectPolygonToLocal(origin, 0, {
      type: "Polygon", coordinates: [
        [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0]],
        [[0.001, 0.001], [0.002, 0.001], [0.002, 0.002], [0.001, 0.001]],
      ],
    })).toBeNull();
  });
  it("returns an unknown pose for nonpositive lot length", () => {
    for (const lotLength of [0, -10]) {
      expect(buildExistingHouseSceneModel({ ...parcelPresets[0], lotLength }).pose).toBeNull();
    }
  });
  it("does not produce an infinite area from finite dimensions", () => {
    expect(buildAduFootprint({ ...defaultAduConfig, width: 1e308, length: 2 }).source).toBe("unknown");
  });
});
