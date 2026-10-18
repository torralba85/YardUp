/**
 * Reusable fixtures for the T01 scene-model contract. Shared by
 * `scene-model.test.ts` and later tasks (T02/T03/T05/T07) that need the same
 * parcels/configs so results stay comparable across test files.
 *
 * Rotated and irregular polygons are synthetic geometry built for test
 * coverage — they do not claim survey accuracy for any real address.
 */
import type { GeoJsonPolygon } from "./parcel-types";
import { parcelPresets, defaultAduConfig, type ADUConfig, type ParcelPreset } from "./feasibility";
import { FT_PER_DEG_LAT } from "./parcel-geometry";

/**
 * Similar construction to `parcel-geometry.test.ts`'s helper of the same
 * name, duplicated here (test-only) to avoid a cross-file test dependency —
 * but rotated the opposite way: `angleDeg` here is a true compass bearing
 * (degrees clockwise from north, matching `projectGeodeticToLocal`'s
 * `bearingDeg`), not `parcel-geometry.test.ts`'s counterclockwise-in-
 * (east,north) convention, since only this file's fixtures need to round-trip
 * through `projectPolygonToLocal`'s bearing-aware transform.
 */
export function rectPolygon(
  lat: number,
  lng: number,
  widthFt: number,
  lengthFt: number,
  angleDeg: number,
): GeoJsonPolygon {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const corners: [number, number][] = [
    [-widthFt / 2, -lengthFt / 2],
    [widthFt / 2, -lengthFt / 2],
    [widthFt / 2, lengthFt / 2],
    [-widthFt / 2, lengthFt / 2],
  ];
  const ring = corners.map(([x, y]) => {
    const rx = x * cosA + y * sinA;
    const ry = -x * sinA + y * cosA;
    return [lng + rx / lngScale, lat + ry / FT_PER_DEG_LAT];
  });
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

/** An L-shaped (concave) polygon — a notch cut from one corner of an otherwise rectangular lot. Not a valid rectangle proxy input for exact-area claims. */
export function irregularPolygon(lat: number, lng: number): GeoJsonPolygon {
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const feetCorners: [number, number][] = [
    [-25, -50],
    [25, -50],
    [25, 20],
    [5, 20],
    [5, 50],
    [-25, 50],
  ];
  const ring = feetCorners.map(([x, y]) => [lng + x / lngScale, lat + y / FT_PER_DEG_LAT]);
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

/** The four demo presets used across the studio (Seattle/Portland/Austin/San Diego), re-exported so tests don't hand-copy their numbers. */
export const demoPresets: ParcelPreset[] = parcelPresets;

/** A live parcel whose real boundary sits at true compass bearing 30° (clockwise from north) relative to the local axes — the oriented-dimension case D3 is about. */
export const rotatedLiveParcel = {
  lotWidth: 40,
  lotLength: 110,
  lotArea: 4400,
  existingHouseSqft: 1400,
  maxLotCoveragePercent: 40,
  setbacks: { front: 20, rear: 20, side: 5 },
  boundaryGeoJson: rectPolygon(47.65, -122.31, 40, 110, 30),
  source: "regrid" as const,
  lat: 47.65,
  lng: -122.31,
};

/** A live parcel whose boundary is concave/irregular — width/length are a bounding-box proxy only. */
export const irregularLiveParcel = {
  lotWidth: 50,
  lotLength: 100,
  lotArea: 4500,
  existingHouseSqft: 1200,
  maxLotCoveragePercent: 40,
  setbacks: { front: 18, rear: 20, side: 5 },
  boundaryGeoJson: irregularPolygon(30.25, -97.75),
  source: "regrid" as const,
  lat: 30.25,
  lng: -97.75,
};

/** A Regrid fallback lookup: no boundary polygon, dimensions estimated from area alone. */
export const fallbackLiveParcel = {
  lotWidth: 45,
  lotLength: 111,
  lotArea: 5000,
  existingHouseSqft: 0,
  maxLotCoveragePercent: 35,
  setbacks: { front: 20, rear: 20, side: 5 },
  boundaryGeoJson: null,
  source: "fallback" as const,
  lat: 32.7,
  lng: -96.8,
};

/**
 * A custom 31 x 20 ADU — the D2/T02 Seattle collision reproduction size.
 * `footprint` is deliberately left at the stale 600 sf preset label so
 * tests can assert modeled area always comes from `width * length`, never
 * this label. (This defends against the class of bug the audit's U2
 * reproduction observed — a saved `size=620` design reloading as 20x30/600
 * sf — but that reload path is in `scenario-url.ts` parsing, which this
 * module does not touch or diagnose.)
 */
export const oversizeAduConfig: ADUConfig = {
  ...defaultAduConfig,
  footprint: 600,
  width: 31,
  length: 20,
};

/** Zero-area ADU config — must resolve to the explicit unknown footprint, never a divide-by-zero or NaN. */
export const zeroAreaAduConfig: ADUConfig = {
  ...defaultAduConfig,
  footprint: 0,
  width: 0,
  length: 0,
};

/** A lot with an out-of-range latitude (not a real coordinate) — must resolve to an unknown scene origin, never a "geocoded" claim. */
export const invalidCoordinatesParcel = {
  lotWidth: 40,
  lotLength: 100,
  lotArea: 4000,
  existingHouseSqft: 1200,
  maxLotCoveragePercent: 40,
  setbacks: { front: 15, rear: 15, side: 5 },
  boundaryGeoJson: null,
  source: "fallback" as const,
  lat: 200,
  lng: -122.31,
};

/** A polygon ring with only 3 points (degenerate/unclosed) — must resolve to a null local projection, not a partial one. */
export const degeneratePolygon: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [[
    [-122.31, 47.65],
    [-122.309, 47.651],
    [-122.308, 47.6505],
  ]],
};

/** A parcel with negative (invalid) setbacks — must resolve to an unknown footprint/pose, never NaN corners. */
export const invalidSetbackParcel = {
  lotWidth: 40,
  lotLength: 100,
  lotArea: 4000,
  existingHouseSqft: 1200,
  maxLotCoveragePercent: 40,
  setbacks: { front: -5, rear: 15, side: -1 },
};
