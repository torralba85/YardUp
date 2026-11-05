/**
 * Plausibility checks for an observed building outline before it is drawn as
 * the existing house or used for placement. Pure and client/server neutral.
 *
 * Building-outline providers sometimes return a polygon that is not the house:
 * a grounds or premise polygon that blankets the lot, or a merged outline that
 * spans several structures or a neighbour. Drawn as-is, that renders the house
 * several times its real size and pushes the ADU into the back of the lot.
 */
import type { GeoJsonPolygon } from "./parcel-types";
import { polygonAreaSqft, polygonContainsPoint } from "./parcel-geometry";

/** At least this share of the outline must lie on the parcel. */
const MIN_SHARE_INSIDE_PARCEL = 0.6;
/** An outline covering more than this share of the lot is the lot, not a house. */
const MAX_SHARE_OF_LOT = 0.8;
/** Footprint may exceed the reference area by this factor (attached garage, porches, measurement error)… */
const MAX_FOOTPRINT_RATIO = 2;
/** …plus this many square feet, so a small reference footprint is not over-tight. */
const FOOTPRINT_SLACK_SQFT = 400;
const SAMPLES_PER_AXIS = 24;

/**
 * Share (0–1) of the outline's area that lies inside the parcel, estimated on a
 * grid over the outline's bounds. Null when either polygon is unusable.
 */
export function outlineShareInsideParcel(
  building: GeoJsonPolygon,
  parcel: GeoJsonPolygon,
): number | null {
  const ring = building?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4 || !parcel?.coordinates?.[0]) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (!(maxLng > minLng) || !(maxLat > minLat)) return null;

  let inBuilding = 0;
  let inBoth = 0;
  for (let i = 0; i < SAMPLES_PER_AXIS; i += 1) {
    const lng = minLng + ((i + 0.5) / SAMPLES_PER_AXIS) * (maxLng - minLng);
    for (let j = 0; j < SAMPLES_PER_AXIS; j += 1) {
      const lat = minLat + ((j + 0.5) / SAMPLES_PER_AXIS) * (maxLat - minLat);
      if (!polygonContainsPoint(building, lng, lat)) continue;
      inBuilding += 1;
      if (polygonContainsPoint(parcel, lng, lat)) inBoth += 1;
    }
  }
  return inBuilding > 0 ? inBoth / inBuilding : null;
}

/**
 * True when the outline plausibly describes a building on this parcel: mostly
 * on the lot, and not so large that it is the lot itself.
 */
export function buildingOutlineFitsParcel(
  building: GeoJsonPolygon,
  parcel: GeoJsonPolygon,
): boolean {
  const share = outlineShareInsideParcel(building, parcel);
  if (share === null || share < MIN_SHARE_INSIDE_PARCEL) return false;
  const lotArea = polygonAreaSqft(parcel);
  const buildingArea = polygonAreaSqft(building);
  if (!(buildingArea > 0)) return false;
  return !(lotArea > 0 && buildingArea > lotArea * MAX_SHARE_OF_LOT);
}

/**
 * True when the outline's area is consistent with an independently observed
 * footprint (or building area). With no usable reference it cannot disagree.
 */
export function buildingOutlineAgreesWithFootprint(
  building: GeoJsonPolygon,
  referenceSqft: number | null | undefined,
): boolean {
  if (typeof referenceSqft !== "number" || !Number.isFinite(referenceSqft) || referenceSqft <= 0) {
    return true;
  }
  return polygonAreaSqft(building) <= referenceSqft * MAX_FOOTPRINT_RATIO + FOOTPRINT_SLACK_SQFT;
}
