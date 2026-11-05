import { describe, expect, it } from "vitest";
import { defaultAduConfig } from "@/lib/feasibility";
import { rectPolygon } from "@/lib/scene-model-fixtures";
import { buildSceneModel, projectLocalToGeodetic } from "@/lib/scene-model";
import { buildAduMeshData } from "@/lib/adu-mesh-data";
import { deriveParcelBearingDeg, polygonContainsPoint } from "@/lib/parcel-geometry";
import { normalizeLiveParcel } from "@/lib/saved-scenarios";
import { getScenePlacement } from "@/lib/site-fit";
import type { GeoJsonPolygon, LiveParcelData } from "@/lib/parcel-types";

// Regressions from the 2026-11-04 audit of #367's observed-geometry work.
const anchor = { lat: 32.8, lng: -117.1 };

/** Local scene feet (bearing 0) to a closed GeoJSON ring around `anchor`. */
function polygon(points: number[][]): GeoJsonPolygon {
  const ring = points.map(([x, z]) => {
    const p = projectLocalToGeodetic(anchor, 0, { x, z })!;
    return [p.lng, p.lat];
  });
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}

const primary = polygon([[-10, 25], [10, 25], [10, 45], [-10, 45]]);
const detached = polygon([[-10, -40], [10, -40], [10, -20], [-10, -20]]);
const parcel: LiveParcelData = {
  address: "Synthetic geometry fixture",
  city: "San Diego",
  state: "CA",
  zip: "92101",
  ...anchor,
  source: "county-gis",
  lotWidth: 60,
  lotLength: 120,
  lotArea: 7200,
  existingHouseSqft: 800,
  maxLotCoveragePercent: 50,
  setbacks: { front: 10, rear: 4, side: 4 },
  zoning: "RS",
  boundaryGeoJson: rectPolygon(anchor.lat, anchor.lng, 60, 120, 0),
  bearingDeg: 0,
  existingBuilding: {
    outlineGeoJson: primary,
    detachedOutlinesGeoJson: [detached],
    geometrySource: "usa-structures",
  },
};

describe("studio observed-geometry contracts", () => {
  it("retains the selected ADU wall dimensions for all roof types", () => {
    for (const roof of ["flat", "gable", "shed"] as const) {
      const config = { ...defaultAduConfig, width: 20, length: 30, roof };
      const positions = buildAduMeshData(config).walls.positions;
      const xs: number[] = [];
      const zs: number[] = [];
      for (let i = 0; i < positions.length; i += 3) {
        xs.push(positions[i]);
        zs.push(positions[i + 2]);
      }
      expect(Math.max(...xs) - Math.min(...xs)).toBe(20);
      expect(Math.max(...zs) - Math.min(...zs)).toBe(30);
    }
  });

  it("retains 60 by 120 foot lot proportions across bearings", () => {
    for (const angle of [0, 15, 30, 45, 70, 90, 135, 170]) {
      const boundaryGeoJson = rectPolygon(anchor.lat, anchor.lng, 60, 120, angle);
      const bearingDeg = deriveParcelBearingDeg(boundaryGeoJson)!;
      const model = buildSceneModel({ ...parcel, boundaryGeoJson, bearingDeg }, defaultAduConfig, { x: 0, z: 0, rotationDeg: 0 });
      const xs = model.parcelOutline.localPolygon!.map((p) => p.x);
      const zs = model.parcelOutline.localPolygon!.map((p) => p.z);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(60, 1);
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(120, 1);
    }
  });

  it("preserves new geometry through parcel normalization", () => {
    const restored = normalizeLiveParcel(parcel)!;
    expect(restored.bearingDeg).toBe(parcel.bearingDeg);
    expect(restored.existingBuilding).toEqual(parcel.existingBuilding);
  });

  it("rejects corrupt observations instead of silently losing an obstacle", () => {
    expect(normalizeLiveParcel({
      ...parcel,
      existingBuilding: {
        ...parcel.existingBuilding,
        detachedOutlinesGeoJson: [{ type: "Polygon", coordinates: [[[Infinity, 32]]] }],
      },
    })).toBeNull();
    expect(normalizeLiveParcel({
      ...parcel,
      existingBuilding: { outlineGeoJson: { type: "Polygon", coordinates: [] } },
    })).toBeNull();
  });

  it("blocks an ADU placed directly over the visible detached structure", () => {
    const config = { ...defaultAduConfig, width: 20, length: 20, footprint: 400 };
    const pose = { x: 0, z: -30, rotationDeg: 0 };
    expect(buildSceneModel(parcel, config, pose).existingHouse.detachedPolygons).toHaveLength(1);
    expect(getScenePlacement(parcel, config, pose).status).toBe("blocked");
  });

  it("checks detached obstacles even without a primary outline", () => {
    const detachedOnly = { ...parcel, existingBuilding: { detachedOutlinesGeoJson: [detached] } };
    expect(getScenePlacement(detachedOnly, defaultAduConfig, { x: 0, z: -30, rotationDeg: 0 }).status).toBe("blocked");
  });

  it("uses an observed outline even when the recorded house area is unknown", () => {
    const model = buildSceneModel({ ...parcel, existingHouseSqft: 0 }, defaultAduConfig, { x: 0, z: -40, rotationDeg: 0 });
    expect(model.existingHouse.localPolygon).toHaveLength(4);
  });

  it("blocks an ADU outside the actual concave lot boundary", () => {
    const boundaryGeoJson = polygon([[-30, -60], [0, -60], [0, 0], [30, 0], [30, 60], [-30, 60]]);
    const config = { ...defaultAduConfig, width: 10, length: 10, footprint: 100 };
    const pose = { x: 15, z: -30, rotationDeg: 0 };
    const geo = projectLocalToGeodetic(anchor, 0, pose)!;
    expect(polygonContainsPoint(boundaryGeoJson, geo.lng, geo.lat)).toBe(false);
    const concaveParcel: LiveParcelData = { ...parcel, boundaryGeoJson };
    expect(getScenePlacement(concaveParcel, config, pose).status).toBe("blocked");
  });

  it("keeps conservative collision bounds separate from the observed footprint", () => {
    const outlineGeoJson = rectPolygon(anchor.lat, anchor.lng, 20, 40, 45);
    const model = buildSceneModel(
      { ...parcel, existingHouseSqft: 800, existingBuilding: { outlineGeoJson } },
      defaultAduConfig,
      { x: 0, z: -40, rotationDeg: 0 },
    );
    expect(model.existingHouse.localPolygon).toHaveLength(4);
    // A 20 × 40 ft house turned 45° fills a ~42 × 42 ft box: collision stays
    // conservative while ParcelScene draws the true outline.
    expect(model.existingHouse.footprint.width! * model.existingHouse.footprint.depth!).toBeCloseTo(1800, 0);
  });
});
