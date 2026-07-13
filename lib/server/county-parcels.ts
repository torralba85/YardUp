/**
 * Free, keyless parcel-geometry fallback: queries public county ArcGIS REST
 * endpoints by point when Regrid returns no parcel. Server-only — never
 * import into client bundles.
 *
 * Counties running Esri software share the same query grammar, so adding a
 * county is a registry entry, not new code. Registry URLs are verified
 * against the live services (see the implementation plan, Task 5).
 */
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import { polygonAreaSqft } from "@/lib/parcel-geometry";

const TIMEOUT_MS = 5000;
const SQFT_PER_ACRE = 43560;

export interface CountyGisSource {
  /** County name without the word "County", e.g. "King". */
  county: string;
  /** Rough lat/lng bounding box for cheap point-in-county routing. */
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Full ArcGIS layer query endpoint, ending in /query. */
  queryUrl: string;
  /** Optional attribute holding lot area; unit says how to convert to sq ft. */
  areaField?: string;
  areaUnit?: "sqft" | "acres";
}

export const COUNTY_GIS_SOURCES: CountyGisSource[] = [
  {
    county: "King",
    bbox: { minLat: 47.08, maxLat: 47.79, minLng: -122.55, maxLng: -121.06 },
    queryUrl:
      "https://services.arcgis.com/Ej0PsM5Aw677QF1W/ArcGIS/rest/services/PARCEL_AREA_439/FeatureServer/0/query",
    areaField: "Shape__Area",
    areaUnit: "sqft",
  },
  {
    county: "Multnomah",
    bbox: { minLat: 45.42, maxLat: 45.73, minLng: -122.93, maxLng: -121.82 },
    queryUrl:
      "https://www.portlandmaps.com/arcgis/rest/services/Public/Taxlots/MapServer/0/query",
    areaField: "A_T_SQFT",
    areaUnit: "sqft",
  },
  {
    county: "Travis",
    bbox: { minLat: 30.02, maxLat: 30.63, minLng: -98.17, maxLng: -97.37 },
    queryUrl:
      "https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer/0/query",
    areaField: "GIS_acres",
    areaUnit: "acres",
  },
];

export interface CountyParcelResult {
  county: string;
  /**
   * The parcel part containing the query point (largest part as fallback) —
   * downstream only supports a single Polygon. Ring 0 is the exterior; any
   * later rings are holes.
   */
  polygon: GeoJsonPolygon;
  /** Assessor/GIS area when available, else hole-aware area of every part. */
  lotAreaSqft: number | null;
}

/**
 * Look up the parcel polygon containing (lat, lng) from a registered county
 * GIS service. Returns null on any failure — county outages must never break
 * the parcel route.
 */
export async function fetchCountyParcel(
  lat: number,
  lng: number,
): Promise<CountyParcelResult | null> {
  const source = COUNTY_GIS_SOURCES.find(
    (s) =>
      lat >= s.bbox.minLat &&
      lat <= s.bbox.maxLat &&
      lng >= s.bbox.minLng &&
      lng <= s.bbox.maxLng,
  );
  if (!source) return null;

  const params = new URLSearchParams({
    f: "geojson",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outSR: "4326",
  });
  if (source.areaField) params.set("outFields", source.areaField);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let json: { features?: unknown } | null = null;
    try {
      const res = await fetch(`${source.queryUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      // Keep the abort timer armed through the body read so a stalled stream
      // trips the same 5s bound as stalled headers.
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    const features = Array.isArray(json?.features) ? json.features : [];
    const best = pickBestFeature(features, lat, lng);
    if (!best) return null;

    // Try both field containers: a server can send an empty `properties`
    // object alongside populated Esri-style `attributes`.
    const lotAreaSqft =
      readAreaField(best.feature.properties, source) ??
      readAreaField(best.feature.attributes, source) ??
      roundedPositive(best.totalAreaSqft);

    return { county: source.county, polygon: best.polygon, lotAreaSqft };
  } catch {
    return null;
  }
}

interface RawFeature {
  geometry?: unknown;
  /** GeoJSON responses put fields here… */
  properties?: Record<string, unknown>;
  /** …Esri JSON responses (servers that ignore f=geojson) put them here. */
  attributes?: Record<string, unknown>;
}

interface ScoredFeature {
  feature: RawFeature;
  polygon: GeoJsonPolygon;
  totalAreaSqft: number;
  containsPoint: boolean;
}

/**
 * Stacked layers (condos, vertical parcels) can return several features for
 * one point, and a feature can be multipart. Prefer the feature whose
 * geometry actually contains the point, then the largest; within a feature,
 * return the part containing the point (largest part as fallback).
 */
function pickBestFeature(
  features: unknown[],
  lat: number,
  lng: number,
): ScoredFeature | null {
  let best: ScoredFeature | null = null;
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const feature = raw as RawFeature;
    const parts = normalizeParts(feature.geometry);
    if (parts.length === 0) continue;
    const totalAreaSqft = parts.reduce(
      (sum, part) => sum + partAreaSqft(part),
      0,
    );
    const containing = parts.find((part) =>
      partContainsPoint(part, lng, lat),
    );
    const polygon =
      containing ??
      parts.reduce((a, b) => (partAreaSqft(b) > partAreaSqft(a) ? b : a));
    const containsPoint = containing !== undefined;
    const beatsBest =
      !best ||
      (containsPoint && !best.containsPoint) ||
      (containsPoint === best.containsPoint &&
        totalAreaSqft > best.totalAreaSqft);
    if (beatsBest) {
      best = { feature, polygon, totalAreaSqft, containsPoint };
    }
  }
  return best;
}

/**
 * Accept GeoJSON Polygon/MultiPolygon or Esri JSON rings as a list of
 * single-polygon parts (ring 0 exterior, later rings holes); else [].
 */
function normalizeParts(geometry: unknown): GeoJsonPolygon[] {
  if (!geometry || typeof geometry !== "object") return [];
  const g = geometry as {
    type?: string;
    coordinates?: unknown;
    rings?: unknown;
  };
  if (g.type === "Polygon" && isRingArray(g.coordinates)) {
    return [{ type: "Polygon", coordinates: g.coordinates as number[][][] }];
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    return (g.coordinates as unknown[])
      .filter(isRingArray)
      .map((part) => ({
        type: "Polygon" as const,
        coordinates: part as number[][][],
      }));
  }
  if (isRingArray(g.rings)) {
    return esriRingsToParts(g.rings as number[][][]);
  }
  return [];
}

function isRingArray(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  const first: unknown = value[0];
  return Array.isArray(first) && first.length > 0 && Array.isArray(first[0]);
}

/**
 * Esri JSON flattens every part and hole into one rings array, encoding the
 * role by winding order (clockwise = exterior) instead of nesting. Ring order
 * is not guaranteed to interleave holes with their shells, so attach each
 * hole to the exterior ring that contains it.
 */
function esriRingsToParts(rings: number[][][]): GeoJsonPolygon[] {
  const parts: GeoJsonPolygon[] = [];
  const holes: number[][][] = [];
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 4) continue;
    if (ringSignedArea(ring) < 0) {
      parts.push({ type: "Polygon", coordinates: [ring] });
    } else {
      holes.push(ring);
    }
  }
  // Largest-first lets an uncontained, sloppily wound exterior become a
  // shell before any smaller rings it contains are assigned.
  holes.sort(
    (a, b) => Math.abs(ringSignedArea(b)) - Math.abs(ringSignedArea(a)),
  );
  for (const hole of holes) {
    const [lng, lat] = hole[0];
    const host = parts
      .filter((part) => ringContainsPoint(part.coordinates[0], lng, lat))
      .reduce<GeoJsonPolygon | null>((smallest, part) => {
        if (!smallest) return part;
        return Math.abs(ringSignedArea(part.coordinates[0])) <
          Math.abs(ringSignedArea(smallest.coordinates[0]))
          ? part
          : smallest;
      }, null);
    if (host) {
      host.coordinates.push(hole);
    } else {
      // No containing exterior: most likely a sloppily wound exterior from a
      // lax service — keep it as its own part rather than corrupt another.
      parts.push({ type: "Polygon", coordinates: [hole] });
    }
  }
  return parts;
}

/** Shoelace signed area in degrees²; negative = clockwise in [lng, lat]. */
function ringSignedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

/** Hole-aware part area: exterior ring minus hole rings, floored at zero. */
function partAreaSqft(part: GeoJsonPolygon): number {
  const [outer, ...holes] = part.coordinates;
  const outerArea = polygonAreaSqft({ type: "Polygon", coordinates: [outer] });
  const holeArea = holes.reduce(
    (sum, ring) =>
      sum + polygonAreaSqft({ type: "Polygon", coordinates: [ring] }),
    0,
  );
  return Math.max(outerArea - holeArea, 0);
}

/** Point-in-part test: inside the exterior ring and outside every hole. */
function partContainsPoint(
  part: GeoJsonPolygon,
  lng: number,
  lat: number,
): boolean {
  const [outer, ...holes] = part.coordinates;
  return (
    ringContainsPoint(outer, lng, lat) &&
    !holes.some((ring) => ringContainsPoint(ring, lng, lat))
  );
}

/** Ray-casting point-in-ring test in [lng, lat] coordinates. */
function ringContainsPoint(
  ring: number[][],
  lng: number,
  lat: number,
): boolean {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function readAreaField(
  properties: Record<string, unknown> | undefined,
  source: CountyGisSource,
): number | null {
  if (!source.areaField || !properties) return null;
  const raw = properties[source.areaField];
  // GIS attribute tables often store numerics as strings. Number() rejects
  // ambiguous values like "1,234" so bad data falls back to computed area.
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(
    source.areaUnit === "acres" ? value * SQFT_PER_ACRE : value,
  );
}

function roundedPositive(value: number): number | null {
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
