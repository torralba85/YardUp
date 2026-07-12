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
  polygon: GeoJsonPolygon;
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
    outFields: source.areaField ?? "",
    returnGeometry: "true",
    outSR: "4326",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${source.queryUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;

    const json = await res.json();
    const feature = json?.features?.[0];
    const polygon = normalizePolygon(feature?.geometry);
    if (!polygon) return null;

    const lotAreaSqft =
      readAreaField(feature?.properties, source) ??
      roundedPositive(polygonAreaSqft(polygon));

    return { county: source.county, polygon, lotAreaSqft };
  } catch {
    return null;
  }
}

/** Accept GeoJSON Polygon/MultiPolygon or Esri JSON rings; else null. */
function normalizePolygon(geometry: unknown): GeoJsonPolygon | null {
  if (!geometry || typeof geometry !== "object") return null;
  const g = geometry as {
    type?: string;
    coordinates?: unknown;
    rings?: unknown;
  };
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    return { type: "Polygon", coordinates: g.coordinates as number[][][] };
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    const first = (g.coordinates as number[][][][])[0];
    if (Array.isArray(first)) return { type: "Polygon", coordinates: first };
  }
  if (Array.isArray(g.rings) && Array.isArray((g.rings as unknown[])[0])) {
    return {
      type: "Polygon",
      coordinates: [(g.rings as number[][][])[0]],
    };
  }
  return null;
}

function readAreaField(
  properties: Record<string, unknown> | undefined,
  source: CountyGisSource,
): number | null {
  if (!source.areaField || !properties) return null;
  const raw = properties[source.areaField];
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(source.areaUnit === "acres" ? raw * SQFT_PER_ACRE : raw);
}

function roundedPositive(value: number): number | null {
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
