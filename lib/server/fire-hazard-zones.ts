/**
 * Free, keyless Fire Hazard Severity Zone (FHSZ) lookup for California
 * parcels. Server-only: never import into client bundles.
 *
 * Three public ArcGIS layers back it, all queried in parallel:
 *   - CAL FIRE's Local Responsibility Area map dated March 24, 2025 (every
 *     rollout phase). It covers all LRA land, publishing "NonWildland" (-3)
 *     polygons outside the zones, so a hit there is a positive "none".
 *   - CAL FIRE's State Responsibility Area map, effective April 1, 2024.
 *   - The City of San Diego's adopted map (Ordinance O-21992, effective
 *     August 30, 2025). The City re-designated every State-mapped Moderate and
 *     High area inside its limits as Very High and added canyon and open-space
 *     areas (with a 500 ft ember buffer) that CAL FIRE does not map. It is the
 *     map SDMC § 141.0302's fire-zone setback reads against, and it marks lots
 *     CAL FIRE calls NonWildland, so CAL FIRE alone would understate the City.
 *     It is only asked about points inside its own extent.
 *
 * The parcel polygon is queried when one is known (any intersecting zone
 * counts; the highest class wins), otherwise the searched point. Local
 * agencies can only add to or raise the State's zones, never lower them, so
 * the highest class any map reports is the class. Every failure path fails
 * soft to `unknown`, which callers must treat as "not checked": a map that
 * did not answer could be the one that puts the lot in a zone.
 */
import type {
  FireHazardZone,
  GeoJsonPolygon,
  ParcelFireHazard,
} from "@/lib/parcel-types";

/** One budget for every layer; they run in parallel, so it is also the worst case. */
const TIMEOUT_MS = 3500;

type KnownZone = Exclude<FireHazardZone, "unknown">;
type Responsibility = NonNullable<ParcelFireHazard["responsibility"]>;

const ZONE_RANK: Record<KnownZone, number> = {
  "very-high": 3,
  high: 2,
  moderate: 1,
  none: 0,
};

export interface FireHazardLayer {
  /** Short source label stored on the parcel. */
  label: string;
  /** Full ArcGIS layer query endpoint, ending in /query. */
  queryUrl: string;
  /** Only the attributes the class is read from; never `*`. */
  outFields: string;
  /** Responsibility area the layer maps, when a feature does not say. */
  responsibility: Responsibility;
  /** Rough lat/lng box; the layer is only queried for points inside it. */
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

/**
 * Registry order breaks ties: the City's adopted map names the source ahead
 * of CAL FIRE's when both report the same class. Every URL and field below was
 * verified against the live service with the exact query this module sends.
 */
export const FIRE_HAZARD_LAYERS: FireHazardLayer[] = [
  {
    label: "City of San Diego FHSZ map (2025)",
    queryUrl:
      "https://webmaps.sandiego.gov/arcgis/rest/services/SDFR/Fire_Public/MapServer/0/query",
    outFields: "FHSZ_Description",
    responsibility: "LRA",
    // The layer's published extent, which also takes in City-owned reservoir
    // land east of the city limits.
    bbox: { minLat: 32.53, maxLat: 33.12, minLng: -117.29, maxLng: -116.54 },
  },
  {
    label: "CAL FIRE LRA FHSZ map (2025)",
    queryUrl:
      "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/FHSALRA25_v1_All/FeatureServer/0/query",
    outFields: "SRA,FHSZ,FHSZ_Description",
    responsibility: "LRA",
  },
  {
    label: "CAL FIRE SRA FHSZ map (2024)",
    queryUrl:
      "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/FHSZSRA_23_3/FeatureServer/0/query",
    outFields: "SRA,FHSZ,FHSZ_Description",
    responsibility: "SRA",
  },
];

interface AnsweredLayer {
  ok: true;
  zone: KnownZone;
  responsibility: Responsibility;
  /** False when the layer answered with no feature at all. */
  matched: boolean;
}

type LayerAnswer = AnsweredLayer | { ok: false };

/**
 * Look up the Fire Hazard Severity Zone for a California parcel.
 *
 * @param input.state - Two-letter state; anything but "CA" is not looked up.
 * @param input.polygon - The parcel outline, when known; preferred over the point.
 * @returns The zone, `unknown` when a map could not be read, or null outside
 *   California.
 */
export async function fetchFireHazardZone(input: {
  lat: number;
  lng: number;
  state: string;
  polygon?: GeoJsonPolygon | null;
}): Promise<ParcelFireHazard | null> {
  if (input.state.trim().toUpperCase() !== "CA") return null;
  const checkedAt = new Date().toISOString();
  const layers = FIRE_HAZARD_LAYERS.filter((layer) => covers(layer, input.lat, input.lng));
  const allSources = listLabels(layers.map((layer) => layer.label));
  const geometry = esriPolygon(input.polygon) ?? esriPoint(input.lat, input.lng);
  if (!geometry) return { zone: "unknown", source: allSources, checkedAt };

  const answers = await Promise.all(
    layers.map((layer) => queryLayer(layer, geometry, TIMEOUT_MS)),
  );

  let found: { layer: FireHazardLayer; answer: AnsweredLayer } | null = null;
  let failed = false;
  for (let index = 0; index < answers.length; index++) {
    const answer = answers[index];
    if (!answer.ok) {
      failed = true;
      continue;
    }
    // Earlier layers win ties, except that a map which placed the parcel on
    // one of its polygons beats one that simply returned nothing.
    const outranks =
      !found ||
      ZONE_RANK[answer.zone] > ZONE_RANK[found.answer.zone] ||
      (ZONE_RANK[answer.zone] === ZONE_RANK[found.answer.zone] && answer.matched && !found.answer.matched);
    if (outranks) found = { layer: layers[index], answer };
  }

  // A High or Very High answer stands even if another map failed: no map can
  // lower a zone. Anything less is only as good as the maps that answered.
  if (found && ZONE_RANK[found.answer.zone] >= ZONE_RANK.high) {
    return {
      zone: found.answer.zone,
      responsibility: found.answer.responsibility,
      source: found.layer.label,
      checkedAt,
    };
  }
  if (failed || !found) return { zone: "unknown", source: allSources, checkedAt };
  return {
    zone: found.answer.zone,
    ...(found.answer.matched ? { responsibility: found.answer.responsibility } : {}),
    source: found.answer.zone === "moderate" ? found.layer.label : allSources,
    checkedAt,
  };
}

/** "A", "A and B", "A, B and C": the source reads as prose in the certificate. */
function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function covers(layer: FireHazardLayer, lat: number, lng: number): boolean {
  const box = layer.bbox;
  return !box || (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng);
}

interface EsriGeometry {
  geometry: string;
  geometryType: "esriGeometryPolygon" | "esriGeometryPoint";
}

function esriPoint(lat: number, lng: number): EsriGeometry | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPoint",
  };
}

/**
 * The parcel's exterior ring as an Esri polygon. Holes are dropped, which can
 * only widen the query. Esri reads a counter-clockwise ring as a hole, and
 * GeoJSON exteriors are usually counter-clockwise, so the ring is turned
 * clockwise. Null when the ring is unusable, so the caller falls back to the
 * point.
 */
function esriPolygon(polygon: GeoJsonPolygon | null | undefined): EsriGeometry | null {
  const ring = polygon?.coordinates?.[0];
  if (!Array.isArray(ring)) return null;
  const points: Array<[number, number]> = [];
  for (const point of ring) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const [lng, lat] = point;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;
    points.push([lng, lat]);
  }
  if (points.length < 3) return null;
  const [firstLng, firstLat] = points[0];
  const [lastLng, lastLat] = points[points.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) points.push([firstLng, firstLat]);
  if (points.length < 4) return null;

  // Shoelace sum: positive for a counter-clockwise ring in lng/lat axes.
  let twiceArea = 0;
  for (let i = 0; i < points.length - 1; i++) {
    twiceArea += points[i][0] * points[i + 1][1] - points[i + 1][0] * points[i][1];
  }
  if (twiceArea === 0) return null;
  const clockwise = twiceArea > 0 ? [...points].reverse() : points;
  return {
    geometry: JSON.stringify({ rings: [clockwise], spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPolygon",
  };
}

/** Query one layer; any transport, status or shape problem is a failed answer. */
async function queryLayer(
  layer: FireHazardLayer,
  geometry: EsriGeometry,
  timeoutMs: number,
): Promise<LayerAnswer> {
  // POST: a surveyed parcel ring can run to hundreds of vertices, past what a
  // query string reliably carries.
  const body = new URLSearchParams({
    f: "json",
    geometry: geometry.geometry,
    geometryType: geometry.geometryType,
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: layer.outFields,
    returnGeometry: "false",
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let json: { features?: unknown; error?: unknown; exceededTransferLimit?: unknown } | null = null;
    try {
      const res = await fetch(layer.queryUrl, {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!res.ok) return { ok: false };
      // Keep the abort timer armed through the body read so a stalled stream
      // trips the same bound as stalled headers.
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    // ArcGIS reports query errors as HTTP 200 with an `error` member.
    if (!json || typeof json !== "object" || json.error || !Array.isArray(json.features)) {
      return { ok: false };
    }
    const features = json.features;
    if (features.length === 0) {
      return { ok: true, zone: "none", responsibility: layer.responsibility, matched: false };
    }

    let zone: KnownZone | null = null;
    let responsibility = layer.responsibility;
    for (const raw of features) {
      const read = readFeature(raw);
      if (!read) continue;
      if (zone === null || ZONE_RANK[read.zone] > ZONE_RANK[zone]) {
        zone = read.zone;
        responsibility = read.responsibility ?? layer.responsibility;
      }
    }
    // Features that carry no readable class mean the layer changed shape, not
    // that the parcel is outside every zone.
    if (zone === null) return { ok: false };
    // A truncated result can hide a higher class, unless it already holds the top one.
    if (json.exceededTransferLimit && zone !== "very-high") return { ok: false };
    return { ok: true, zone, responsibility, matched: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Read a feature's class. CAL FIRE publishes a numeric `FHSZ` code (3 Very
 * High, 2 High, 1 Moderate, negative for non-zoned land) beside its
 * description; the City publishes only the description. Esri JSON carries
 * fields in `attributes`; `properties` is accepted for a GeoJSON answer.
 */
function readFeature(
  raw: unknown,
): { zone: KnownZone; responsibility?: Responsibility } | null {
  if (!raw || typeof raw !== "object") return null;
  const feature = raw as {
    attributes?: Record<string, unknown>;
    properties?: Record<string, unknown>;
  };
  const bag = feature.attributes ?? feature.properties;
  if (!bag) return null;

  const zone = zoneFromCode(bag.FHSZ) ?? zoneFromDescription(bag.FHSZ_Description);
  if (!zone) return null;
  const area = typeof bag.SRA === "string" ? bag.SRA.trim().toUpperCase() : "";
  return area === "SRA" || area === "LRA" ? { zone, responsibility: area } : { zone };
}

function zoneFromCode(value: unknown): KnownZone | null {
  const code =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  if (!Number.isInteger(code)) return null;
  if (code === 3) return "very-high";
  if (code === 2) return "high";
  if (code === 1) return "moderate";
  return code <= 0 ? "none" : null;
}

function zoneFromDescription(value: unknown): KnownZone | null {
  if (typeof value !== "string") return null;
  const key = value.toLowerCase().replace(/[^a-z]/g, "");
  if (key === "veryhigh") return "very-high";
  if (key === "high") return "high";
  if (key === "moderate") return "moderate";
  if (key.startsWith("nonwildland") || key === "urbanunzoned") return "none";
  return null;
}
