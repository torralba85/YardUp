/**
 * Free, keyless existing-structure footprints from FEMA/ORNL USA Structures —
 * a nationwide layer of ~135M building outlines derived from imagery.
 * Server-only: never import into client bundles.
 *
 * This fills the field Regrid's standard schema most often leaves blank
 * (`ll_bldg_footprint_sqft`) and that a county lot layer never carries at all,
 * because a parcel layer describes land, not what is built on it.
 *
 * Attribution: structures are only counted when the parcel polygon is known.
 * The service is queried by the parcel's bounding box — a well-indexed, fast
 * query — and each returned structure is then matched to the lot by its own
 * published centroid (LONGITUDE/LATITUDE). Querying the polygon directly with
 * `esriSpatialRelIntersects` would instead pull in every neighbouring
 * structure whose outline merely grazes the boundary, which is common when
 * parcel lines and imagery-derived outlines come from different sources.
 *
 * Coverage caveat: imagery-derived inventories can miss structures or lag
 * recent construction. A zero count therefore means "nothing found", never
 * "the lot is vacant", and callers must not present it as a measured zero.
 */
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import { polygonContainsPoint } from "@/lib/parcel-geometry";

const USA_STRUCTURES_QUERY =
  "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query";
const TIMEOUT_MS = 4000;

export interface BuildingFootprintResult {
  /**
   * Total footprint of every structure whose centroid falls inside the
   * parcel, in square feet. Lot-coverage rules count all structures, not just
   * the dwelling, so this is the figure coverage compliance needs.
   */
  totalSqft: number;
  /** Footprint of the largest structure — the main dwelling, in practice. */
  largestSqft: number;
  /** How many structures matched. Zero means "none found", not "vacant". */
  structureCount: number;
}

/**
 * Sum the building footprints standing on a parcel.
 *
 * @param polygon - The parcel outline; structures are matched against it.
 * @returns The footprint totals, or null when the lookup could not run.
 *   A successful lookup that found nothing returns a zero-count result.
 */
export async function fetchBuildingFootprint(
  polygon: GeoJsonPolygon,
): Promise<BuildingFootprintResult | null> {
  const bbox = polygonBbox(polygon);
  if (!bbox) return null;

  const params = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify({
      xmin: bbox.minLng,
      ymin: bbox.minLat,
      xmax: bbox.maxLng,
      ymax: bbox.maxLat,
      spatialReference: { wkid: 4326 },
    }),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "SQFEET,LONGITUDE,LATITUDE",
    // The centroid attributes are all we need, and skipping geometry keeps
    // the response small enough to stay well inside the timeout.
    returnGeometry: "false",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let json: { features?: unknown } | null = null;
    try {
      const res = await fetch(`${USA_STRUCTURES_QUERY}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      // Keep the abort timer armed through the body read so a stalled stream
      // trips the same bound as stalled headers.
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const features = Array.isArray(json?.features) ? json.features : [];
    let totalSqft = 0;
    let largestSqft = 0;
    let structureCount = 0;

    for (const raw of features) {
      const attributes = readAttributes(raw);
      if (!attributes) continue;
      const { sqft, lng, lat } = attributes;
      if (!polygonContainsPoint(polygon, lng, lat)) continue;
      totalSqft += sqft;
      largestSqft = Math.max(largestSqft, sqft);
      structureCount += 1;
    }

    return {
      totalSqft: Math.round(totalSqft),
      largestSqft: Math.round(largestSqft),
      structureCount,
    };
  } catch {
    return null;
  }
}

/**
 * Pull a usable structure record out of a feature. Esri JSON puts fields in
 * `attributes`; a server honouring `f=geojson` would use `properties`, so both
 * are accepted. Non-positive or non-finite areas are dropped rather than
 * summed as zero-footprint structures.
 */
function readAttributes(
  raw: unknown,
): { sqft: number; lng: number; lat: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const feature = raw as {
    attributes?: Record<string, unknown>;
    properties?: Record<string, unknown>;
  };
  const bag = feature.attributes ?? feature.properties;
  if (!bag) return null;

  const sqft = finiteNumber(bag.SQFEET);
  const lng = finiteNumber(bag.LONGITUDE);
  const lat = finiteNumber(bag.LATITUDE);
  if (sqft === null || sqft <= 0 || lng === null || lat === null) return null;
  return { sqft, lng, lat };
}

function finiteNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Axis-aligned bounds of the polygon's exterior ring, in degrees. */
function polygonBbox(polygon: GeoJsonPolygon): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} | null {
  const ring = polygon?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const [lng, lat] = point;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;
  return { minLat, maxLat, minLng, maxLng };
}
