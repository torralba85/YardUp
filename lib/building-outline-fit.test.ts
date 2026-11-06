import { describe, expect, it } from "vitest";
import type { GeoJsonPolygon } from "./parcel-types";
import {
  buildingOutlineAgreesWithFootprint,
  buildingOutlineFitsParcel,
  outlineShareInsideParcel,
} from "./building-outline-fit";
import { buildExistingHouseSceneModel } from "./scene-model";

// 141 N Almaden Blvd, San Jose: a 34 x 137 ft county-GIS lot with a 661 sf
// USA Structures house near the street.
const A = [-121.898703403826, 37.3354837447928];
const B = [-121.898763474844, 37.3355626157953];
const C = [-121.898354394803, 37.3357536148407];
const D = [-121.898295835785, 37.3356743828381];
const LOT: GeoJsonPolygon = { type: "Polygon", coordinates: [[A, B, C, D, A]] };
const HOUSE: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [[
    [-121.89831840589, 37.335657317124],
    [-121.898414969393, 37.3356112881719],
    [-121.898450598374, 37.3356589427503],
    [-121.898354033972, 37.3357049709589],
    [-121.89831840589, 37.335657317124],
  ]],
};

const lerp = (p: number[], q: number[], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
/** A full-width slab over 60% of the lot's length — the reported oversized house. */
const SLAB: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [[lerp(A, D, 0.2), lerp(B, C, 0.2), lerp(B, C, 0.8), lerp(A, D, 0.8), lerp(A, D, 0.2)]],
};

function shift(polygon: GeoJsonPolygon, dLng: number): GeoJsonPolygon {
  return { type: "Polygon", coordinates: polygon.coordinates.map((ring) => ring.map(([lng, lat]) => [lng + dLng, lat])) };
}

describe("buildingOutlineFitsParcel", () => {
  it("accepts the observed house, even with an edge a little past the lot line", () => {
    expect(outlineShareInsideParcel(HOUSE, LOT)).toBeGreaterThan(0.85);
    expect(buildingOutlineFitsParcel(HOUSE, LOT)).toBe(true);
  });

  it("rejects an outline that is the lot itself", () => {
    expect(buildingOutlineFitsParcel(LOT, LOT)).toBe(false);
  });

  it("rejects an outline that mostly sits on a neighbouring lot", () => {
    // Shifted ~40 ft east: only a sliver still overlaps the 34 ft-wide lot.
    expect(buildingOutlineFitsParcel(shift(HOUSE, 0.00014), LOT)).toBe(false);
  });
});

describe("buildingOutlineAgreesWithFootprint", () => {
  it("accepts an outline consistent with the measured footprint", () => {
    expect(buildingOutlineAgreesWithFootprint(HOUSE, 661)).toBe(true);
  });

  it("rejects an outline several times the measured footprint", () => {
    expect(buildingOutlineAgreesWithFootprint(SLAB, 661)).toBe(false);
  });

  it("cannot disagree without a reference footprint", () => {
    expect(buildingOutlineAgreesWithFootprint(SLAB, null)).toBe(true);
    expect(buildingOutlineAgreesWithFootprint(SLAB, 0)).toBe(true);
  });
});

describe("existing house scene model with an implausible outline", () => {
  const parcel = {
    lotWidth: 34,
    lotLength: 137,
    existingHouseSqft: 661,
    setbacks: { front: 20, rear: 20, side: 5 },
    bearingDeg: 59.6,
    boundaryGeoJson: LOT,
    lat: 37.3356477,
    lng: -121.8984148,
    source: "county-gis" as const,
  };

  it("draws the observed house at its measured size", () => {
    const model = buildExistingHouseSceneModel({ ...parcel, existingBuilding: { outlineGeoJson: HOUSE } });
    expect(model.localPolygon).toHaveLength(4);
    expect(model.observedRectangle!.width * model.observedRectangle!.depth).toBeCloseTo(661, -1);
  });

  it("falls back to the measured area instead of drawing an oversized slab", () => {
    const model = buildExistingHouseSceneModel({ ...parcel, existingBuilding: { outlineGeoJson: SLAB } });
    expect(model.localPolygon).toBeUndefined();
    expect(model.footprint.areaSqft).toBe(661);
    expect(model.footprint.width! * model.footprint.depth!).toBeCloseTo(661, 5);
  });
});
