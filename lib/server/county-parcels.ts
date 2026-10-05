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
import type { ProviderAttempt, ProviderOutcome } from "@/lib/data-evidence";
import {
  FT_PER_DEG_LAT,
  distanceToPolygonFt,
  interiorPoint,
  polygonAreaSqft,
  polygonContainsPoint,
  ringContainsPoint,
} from "@/lib/parcel-geometry";
import {
  type SitusFieldNames,
  type SitusRecord,
  type StreetAddress,
  compareSitus,
  readSitusAddress,
  readSitusRecord,
  situsOutFields,
} from "@/lib/server/address-match";

const TIMEOUT_MS = 5000;
const SQFT_PER_ACRE = 43560;
/**
 * Shared budget for the whole address stage: verifying the point's parcel
 * against its official street address and, if that contradicts the search,
 * looking the address up. One deadline covers both so the stage cannot double
 * the caller's wait.
 */
export const ADDRESS_STAGE_TIMEOUT_MS = 4000;
/**
 * Half-width of the search window around the geocoded point, and the farthest a
 * situs-matched parcel may sit from it. Comfortably wider than the block-face
 * drift between two geocoders, narrow enough that a same-numbered address in
 * another part of town can never be in the window.
 */
export const ADDRESS_MATCH_RADIUS_FT = 500;

/**
 * An address-enriched twin of a registered parcel layer: same publisher, same
 * parcels, plus the official situs address and parcel identifier the
 * geometry-only layer lacks.
 *
 * Only the attributes named in {@link fields} are ever requested. Enriched
 * county layers also publish owner names and mailing addresses; those are
 * neither needed nor asked for, and `outFields` is never `*`.
 */
export interface SitusEndpoint {
  /** Full ArcGIS layer query endpoint, ending in /query. */
  queryUrl: string;
  fields: SitusFieldNames;
}

export interface CountyGisSource {
  /**
   * Label for the coverage area: a county name without the word "County"
   * (e.g. "King") for county services, or "<State> (statewide)" for the
   * statewide layers. Used as the result's county only when the service
   * carries no `countyField` of its own.
   */
  county: string;
  /** Rough lat/lng bounding box for cheap point-in-county routing. */
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Full ArcGIS layer query endpoint, ending in /query. */
  queryUrl: string;
  /** Optional attribute holding lot area; unit says how to convert to sq ft. */
  areaField?: string;
  areaUnit?: "sqft" | "acres";
  /** Optional attribute holding the county name, for statewide layers. */
  countyField?: string;
  /**
   * Official address-enriched endpoint for verifying that a parcel belongs to
   * a searched street address. Registered only where a publisher provides one;
   * a source without it is never address-verified and no address data is
   * inferred for it.
   */
  situs?: SitusEndpoint;
}

/**
 * Ordered candidate list: county services first (more current and more
 * precisely attributed), statewide layers second as the backstop that
 * covers everywhere the county registry does not reach. `fetchCountyParcel`
 * walks every bbox match in this order, so a county outage or a coverage
 * hole falls through to the state instead of ending the lookup.
 *
 * Every URL below was verified against the live service with the exact
 * query grammar this module sends. Statewide coverage is real but uneven —
 * WA, FL, and NV in particular return no feature for some addresses, which
 * is why the caller must still tolerate a null result.
 */
export const COUNTY_GIS_SOURCES: CountyGisSource[] = [
  {
    county: "King",
    bbox: { minLat: 47.08, maxLat: 47.79, minLng: -122.55, maxLng: -121.06 },
    queryUrl:
      "https://services.arcgis.com/Ej0PsM5Aw677QF1W/ArcGIS/rest/services/PARCEL_AREA_439/FeatureServer/0/query",
    areaField: "Shape__Area",
    areaUnit: "sqft",
    // King County's own address-enriched publication of the same parcels; the
    // geometry-only layer above has no address attributes. Field names come
    // from the layer's published metadata.
    situs: {
      queryUrl:
        "https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query",
      fields: {
        id: "PIN",
        line: "ADDR_FULL",
        cities: ["CTYNAME", "POSTALCTYNAME"],
        zip: "ZIP5",
        state: "STATE_ABBR",
        // Same parcel, same unit as the geometry layer's Shape__Area (both
        // publish 5155.45 sq ft for one lot when queried side by side).
        area: "Shape__Area",
      },
    },
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
  // --- Statewide backstops -------------------------------------------------
  {
    county: "California (statewide)",
    bbox: { minLat: 32.53, maxLat: 42.01, minLng: -124.41, maxLng: -114.13 },
    queryUrl:
      "https://bz1uwWPKUInZBK94.svcs5.arcgis.com/bz1uwWPKUInZBK94/arcgis/rest/services/CA_Statewide_Parcels_Public_view/FeatureServer/0/query",
    countyField: "COUNTYNAME",
    situs: {
      queryUrl:
        "https://bz1uwWPKUInZBK94.svcs5.arcgis.com/bz1uwWPKUInZBK94/arcgis/rest/services/CA_Statewide_Parcels_Public_view/FeatureServer/0/query",
      fields: {
        id: "PARCEL_APN",
        line: "SITE_ADDR",
        cities: ["SITE_CITY"],
        zip: "SITE_ZIP",
        state: "SITE_STATE",
      },
    },
  },
  {
    county: "Washington (statewide)",
    bbox: { minLat: 45.54, maxLat: 49.0, minLng: -124.85, maxLng: -116.91 },
    queryUrl:
      "https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0/query",
  },
  {
    county: "New York (statewide)",
    bbox: { minLat: 40.5, maxLat: 45.02, minLng: -79.76, maxLng: -71.86 },
    queryUrl:
      "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/MapServer/1/query",
    areaField: "SQ_FT",
    areaUnit: "sqft",
    countyField: "COUNTY_NAME",
  },
  {
    county: "Ohio (statewide)",
    bbox: { minLat: 38.4, maxLat: 42.33, minLng: -84.82, maxLng: -80.52 },
    queryUrl:
      "https://services2.arcgis.com/MlJ0G8iWUyC7jAmu/arcgis/rest/services/OhioStatewidePacels_full_view/FeatureServer/0/query",
    areaField: "LandArea",
    areaUnit: "acres",
    countyField: "County",
  },
  {
    county: "Wisconsin (statewide)",
    bbox: { minLat: 42.49, maxLat: 47.31, minLng: -92.89, maxLng: -86.76 },
    queryUrl:
      "https://services3.arcgis.com/n6uYoouQZW75n5WI/arcgis/rest/services/Wisconsin_Statewide_Parcels_DB/FeatureServer/0/query",
    areaField: "GISACRES",
    areaUnit: "acres",
    countyField: "CONAME",
  },
  {
    county: "Florida (statewide)",
    bbox: { minLat: 24.4, maxLat: 31.0, minLng: -87.63, maxLng: -79.97 },
    queryUrl:
      "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query",
    areaField: "LND_SQFOOT",
    areaUnit: "sqft",
  },
  {
    county: "Vermont (statewide)",
    bbox: { minLat: 42.73, maxLat: 45.02, minLng: -73.44, maxLng: -71.47 },
    queryUrl:
      "https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Cadastral_VTPARCELS_poly_standardized_parcels_SP_v1/FeatureServer/0/query",
    areaField: "ACRESGL",
    areaUnit: "acres",
  },
  {
    // Nevada DOT republishes a 2018 county roll — stale for assessed values
    // but still the correct lot geometry for all but recent subdivisions.
    county: "Nevada (statewide)",
    bbox: { minLat: 35.0, maxLat: 42.0, minLng: -120.01, maxLng: -114.04 },
    queryUrl:
      "https://gis.dot.nv.gov/agsphs/rest/services/Reference/Statewide_Parcels/MapServer/0/query",
    areaField: "Acres",
    areaUnit: "acres",
    countyField: "County",
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
  /**
   * Area of {@link polygon} — the same scope downstream measures against.
   *
   * A single-part feature prefers the assessor/GIS area field, which is more
   * authoritative than anything derivable from the published geometry. A
   * multipart feature falls back to the returned part's own hole-aware area:
   * the provider's field covers every part, so using it here would overstate
   * the lot that {@link polygon} actually describes.
   */
  lotAreaSqft: number | null;
  /** Assessor/GIS attribute versus a calculation from the selected polygon. */
  areaBasis?: "reported" | "geometry";
}

export interface CountyParcelLookup {
  parcel: CountyParcelResult | null;
  attempts: ProviderAttempt[];
}

/**
 * Look up the parcel polygon containing (lat, lng) from the registered GIS
 * services, trying every bbox match in registry order — county services
 * first, then the statewide backstop — so one service's outage or coverage
 * hole falls through to the next instead of ending the lookup.
 *
 * Returns null on any failure: GIS outages must never break the parcel route.
 * The whole walk shares a single {@link TIMEOUT_MS} budget, so adding sources
 * widens coverage without widening the caller's worst-case latency. Each
 * candidate gets a bounded share of what is left, so a hanging county
 * endpoint cannot spend the entire deadline and starve the statewide
 * fallback behind it.
 */
export async function fetchCountyParcel(
  lat: number,
  lng: number,
): Promise<CountyParcelResult | null> {
  return (await fetchCountyParcelWithDiagnostics(lat, lng)).parcel;
}

/** Lookup variant that preserves why each configured provider did or did not answer. */
export async function fetchCountyParcelWithDiagnostics(
  lat: number,
  lng: number,
): Promise<CountyParcelLookup> {
  const candidates = sourcesCovering(lat, lng);
  if (candidates.length === 0) {
    return {
      parcel: null,
      attempts: [{
        provider: "ArcGIS",
        dataset: "Configured public parcel registry",
        outcome: "unsupported",
        detail: "No configured public parcel source covers this coordinate.",
      }],
    };
  }

  const deadline = Date.now() + TIMEOUT_MS;
  const attempts: ProviderAttempt[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    // Split what is left evenly across the candidates still to try, so the
    // first source cannot consume the whole budget. A source that answers
    // early hands its unused share to the ones behind it.
    const budget = Math.max(1, Math.floor(remaining / (candidates.length - index)));
    const result = await queryGisSource(candidates[index], lat, lng, budget);
    attempts.push(result.attempt);
    if (result.parcel) return { parcel: result.parcel, attempts };
  }
  return { parcel: null, attempts };
}

/** Registered sources whose bounding box contains the point, in registry order. */
function sourcesCovering(lat: number, lng: number): CountyGisSource[] {
  return COUNTY_GIS_SOURCES.filter(
    (s) =>
      lat >= s.bbox.minLat &&
      lat <= s.bbox.maxLat &&
      lng >= s.bbox.minLng &&
      lng <= s.bbox.maxLng,
  );
}

interface SourceQueryResult {
  parcel: CountyParcelResult | null;
  attempt: ProviderAttempt;
}

/** Query one registered service while preserving no-match vs provider failure. */
async function queryGisSource(
  source: CountyGisSource,
  lat: number,
  lng: number,
  timeoutMs: number,
): Promise<SourceQueryResult> {
  const params = new URLSearchParams({
    f: "geojson",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outSR: "4326",
  });
  const outFields = [source.areaField, source.countyField].filter(Boolean);
  if (outFields.length > 0) params.set("outFields", outFields.join(","));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let json: { features?: unknown; error?: unknown; exceededTransferLimit?: boolean } | null = null;
    try {
      const res = await fetch(`${source.queryUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          parcel: null,
          attempt: providerAttempt(source, "provider-error", `HTTP ${res.status}`),
        };
      }
      // Keep the abort timer armed through the body read so a stalled stream
      // trips the same bound as stalled headers.
      json = await res.json();
    } finally {
      clearTimeout(timer);
    }

    if (!Array.isArray(json?.features) || json.error || json.exceededTransferLimit) {
      return { parcel: null, attempt: providerAttempt(source, "invalid-response", "The service returned an error, incomplete results, or no feature collection.") };
    }
    const features = json.features;
    const best = pickBestFeature(features, lat, lng);
    if (!best || !best.containsPoint) {
      return {
        parcel: null,
        attempt: providerAttempt(
          source,
          features.length === 0 ? "no-match" : "invalid-response",
          features.length === 0
            ? "The service returned no parcel at this point."
            : "The service returned features without a usable polygon.",
        ),
      };
    }

    return {
      parcel: buildParcelResult(
        source,
        best.feature,
        best.polygon,
        best.partCount,
        best.selectedAreaSqft,
      ),
      attempt: providerAttempt(source, "matched"),
    };
  } catch (error) {
    const timedOut = isAbortError(error);
    return {
      parcel: null,
      attempt: providerAttempt(
        source,
        timedOut ? "timeout" : "provider-error",
        timedOut ? "The provider exceeded its lookup budget." : "The provider request failed.",
      ),
    };
  }
}

/**
 * Whether a fetch failed because our own abort timer fired. Matched by name, not
 * `instanceof Error`: a DOMException from another realm (jsdom, a polyfill) is
 * not an Error instance but carries the same name.
 */
function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/** Assemble the result for a selected feature part; shared by point and address lookups. */
function buildParcelResult(
  source: CountyGisSource,
  feature: RawFeature,
  polygon: GeoJsonPolygon,
  partCount: number,
  selectedAreaSqft: number,
): CountyParcelResult {
  // Try both field containers: a server can send an empty `properties`
  // object alongside populated Esri-style `attributes`.
  const providerArea =
    readAreaField(feature.properties, source) ??
    readAreaField(feature.attributes, source);
  // The provider's field covers the whole feature. Only a single-part
  // feature shares its scope with the polygon returned above, so a
  // multipart feature must report the selected part's own area instead.
  const selectedArea = roundedPositive(selectedAreaSqft);
  const lotAreaSqft =
    partCount === 1 ? providerArea ?? selectedArea : selectedArea;

  const county =
    readCountyField(feature.properties, source) ??
    readCountyField(feature.attributes, source) ??
    source.county;

  return { county, polygon, lotAreaSqft, areaBasis: partCount === 1 && providerArea !== null ? "reported" : "geometry" };
}

function providerAttempt(
  source: CountyGisSource,
  outcome: ProviderOutcome,
  detail?: string,
): ProviderAttempt {
  return {
    provider: "ArcGIS",
    dataset: `${source.county} parcels`,
    sourceUrl: source.queryUrl.replace(/\/query$/i, ""),
    outcome,
    ...(detail ? { detail } : {}),
  };
}

// ---------------------------------------------------------------------------
// Street-address verification against official address-enriched layers
// ---------------------------------------------------------------------------

type SituatedSource = CountyGisSource & { situs: SitusEndpoint };

function hasSitus(source: CountyGisSource): source is SituatedSource {
  return source.situs !== undefined;
}

/** The deadline for one address stage; pass the same one to every step. */
export function addressStageDeadline(): number {
  return Date.now() + ADDRESS_STAGE_TIMEOUT_MS;
}

/** Attempt record for a source's address-enriched endpoint (not its geometry layer). */
function situsAttempt(
  source: SituatedSource,
  outcome: ProviderOutcome,
  detail?: string,
): ProviderAttempt {
  return {
    provider: "ArcGIS",
    dataset: `${source.county} parcel addresses`,
    sourceUrl: source.situs.queryUrl.replace(/\/query$/i, ""),
    outcome,
    ...(detail ? { detail } : {}),
  };
}

type SitusFetch =
  | { features: unknown[]; truncated: boolean }
  | { failure: ProviderAttempt };

/**
 * One bounded request to an address-enriched endpoint. Never throws: HTTP
 * errors, timeouts, and unreadable bodies come back as a failed attempt.
 */
async function fetchSitusFeatures(
  source: SituatedSource,
  params: URLSearchParams,
  timeoutMs: number,
): Promise<SitusFetch> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${source.situs.queryUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        return { failure: situsAttempt(source, "provider-error", `HTTP ${res.status}`) };
      }
      // Keep the abort timer armed through the body read.
      const json = (await res.json()) as {
        features?: unknown;
        exceededTransferLimit?: unknown;
        properties?: { exceededTransferLimit?: unknown };
      } | null;
      return {
        features: Array.isArray(json?.features) ? json.features : [],
        truncated:
          json?.exceededTransferLimit === true ||
          json?.properties?.exceededTransferLimit === true,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const timedOut = isAbortError(error);
    return {
      failure: situsAttempt(
        source,
        timedOut ? "timeout" : "provider-error",
        timedOut ? "The provider exceeded its lookup budget." : "The provider request failed.",
      ),
    };
  }
}

/** Identity and situs values of one returned feature, or null when it carries none. */
function readFeatureSitus(raw: unknown, fields: SitusFieldNames): SitusRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const feature = raw as RawFeature;
  return (
    readSitusRecord(feature.properties, fields) ??
    readSitusRecord(feature.attributes, fields)
  );
}

/** Split what is left of the deadline evenly across the sources still to try. */
function budgetFor(deadline: number, sourcesLeft: number): number {
  return Math.max(1, Math.floor((deadline - Date.now()) / sourcesLeft));
}

export interface PointAddressCheck {
  /**
   * - `verified`: the official parcel at the point publishes the searched
   *   address, and only one distinct parcel does.
   * - `mismatch`: the official layer answered and the parcel at the point does
   *   not publish the searched address (a different street address, a
   *   contradicting city/ZIP/state, or two parcels claiming it). The point's
   *   parcel is not the searched property.
   * - `unverified`: a registered address layer covers the point but could not
   *   answer (outage, timeout, no record, no identifier). Nothing is known.
   * - `unsupported`: no address layer is registered here; nothing was asked.
   */
  verdict: "verified" | "mismatch" | "unverified" | "unsupported";
  /** Official parcel identifier: the verified parcel's, or the sole parcel found at a mismatching point. */
  parcelId?: string;
  /** For `verified`: whether the layer's own city or ZIP confirmed the match. */
  localityConfirmed?: boolean;
  /** Geometry and area from the SAME official feature that supplied the PIN. */
  parcel?: CountyParcelResult;
  attempts: ProviderAttempt[];
}

/**
 * Check that the parcel at a searched point really is the searched street
 * address, by asking the official address-enriched layer who owns the point.
 *
 * A geocoder's point can land on a neighbouring lot; a polygon that merely
 * contains the point proves nothing about the address. Only the allowlisted
 * situs attributes are requested, together with that record's geometry so its
 * identity can never be attached to an unrelated point-layer polygon. Never throws.
 */
export async function verifyParcelAddressAtPoint(
  lat: number,
  lng: number,
  address: StreetAddress,
  deadline: number = addressStageDeadline(),
): Promise<PointAddressCheck> {
  const sources = sourcesCovering(lat, lng).filter(hasSitus);
  if (sources.length === 0) return { verdict: "unsupported", attempts: [] };

  const attempts: ProviderAttempt[] = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    if (deadline - Date.now() <= 0) {
      attempts.push(
        situsAttempt(source, "timeout", "The address check ran out of its time budget."),
      );
      break;
    }
    const params = new URLSearchParams({
      f: "geojson",
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      returnGeometry: "true",
      outSR: "4326",
      outFields: situsOutFields(source.situs.fields),
    });
    const fetched = await fetchSitusFeatures(
      source,
      params,
      budgetFor(deadline, sources.length - index),
    );
    if ("failure" in fetched) {
      attempts.push(fetched.failure);
      continue;
    }
    if (fetched.truncated) {
      attempts.push(situsAttempt(source, "invalid-response", "The address response was truncated; parcel identity could not be verified."));
      continue;
    }

    try {
      const check = classifyPointParcels(source, fetched.features, address);
      if (check.verdict === "verified") {
        const best = pickBestFeature(
          fetched.features.filter((raw) => readFeatureSitus(raw, source.situs.fields)?.id === check.parcelId),
          lat,
          lng,
        );
        if (!best?.containsPoint) {
          attempts.push(situsAttempt(source, "invalid-response", "The published address has no usable polygon containing the searched point; identity could not be tied to the boundary."));
          continue;
        }
        const parcel = buildParcelResult(
          { ...source, areaField: source.situs.fields.area },
          best.feature,
          best.polygon,
          best.partCount,
          best.selectedAreaSqft,
        );
        if ((parcel.lotAreaSqft ?? 0) <= 0) {
          attempts.push(situsAttempt(source, "invalid-response", "The published address has no usable parcel area."));
          continue;
        }
        attempts.push(check.attempt);
        return {
          verdict: "verified", parcelId: check.parcelId,
          localityConfirmed: check.localityConfirmed, parcel, attempts,
        };
      }
      attempts.push(check.attempt);
      if (check.verdict !== "unverified") {
        return {
          verdict: check.verdict,
          ...(check.parcelId ? { parcelId: check.parcelId } : {}),
          ...(check.localityConfirmed !== undefined
            ? { localityConfirmed: check.localityConfirmed }
            : {}),
          attempts,
        };
      }
    } catch {
      attempts.push(
        situsAttempt(source, "provider-error", "The provider response could not be read."),
      );
    }
  }
  return { verdict: "unverified", attempts };
}

interface PointClassification {
  verdict: "verified" | "mismatch" | "unverified";
  parcelId?: string;
  localityConfirmed?: boolean;
  attempt: ProviderAttempt;
}

function classifyPointParcels(
  source: SituatedSource,
  features: unknown[],
  address: StreetAddress,
): PointClassification {
  if (features.length === 0) {
    return {
      verdict: "unverified",
      attempt: situsAttempt(
        source,
        "no-match",
        "The address layer has no parcel at the searched point.",
      ),
    };
  }
  const records = features.flatMap((raw) => readFeatureSitus(raw, source.situs.fields) ?? []);
  if (records.length === 0) {
    return {
      verdict: "unverified",
      attempt: situsAttempt(
        source,
        "invalid-response",
        "The address layer returned a parcel without a parcel identifier and street address.",
      ),
    };
  }

  // A filtered subset cannot prove uniqueness among all overlapping records.
  if (records.length !== features.length) {
    return {
      verdict: "unverified",
      attempt: situsAttempt(source, "invalid-response", "Some overlapping parcels have incomplete identity; the searched point could not be verified."),
    };
  }

  const matches = new Map<string, boolean>();
  // The geometry-only point layer may select a different overlapping parcel.
  // Without a common identity key, one matching situs among distinct lots
  // cannot vouch for that selected polygon. Reconcile the address instead.
  if (new Set(records.map((record) => record.id)).size > 1) {
    return {
      verdict: "mismatch",
      attempt: situsAttempt(source, "invalid-response", "Multiple distinct parcels overlap the searched point; none was selected."),
    };
  }
  let conflicts = 0;
  for (const record of records) {
    const comparison = compareSitus(address, record);
    if (comparison.verdict === "match") matches.set(record.id, comparison.localityConfirmed);
    else if (comparison.verdict === "locality-conflict") conflicts += 1;
  }

  if (matches.size === 1) {
    const [parcelId, localityConfirmed] = Array.from(matches.entries())[0];
    return {
      verdict: "verified",
      parcelId,
      localityConfirmed,
      attempt: situsAttempt(
        source,
        "matched",
        `The searched address was verified against the official parcel at the searched point (${parcelId}).`,
      ),
    };
  }
  if (matches.size > 1) {
    return {
      verdict: "mismatch",
      attempt: situsAttempt(
        source,
        "invalid-response",
        "Multiple distinct parcels at the searched point publish this street address; none was selected.",
      ),
    };
  }

  const ids = records
    .map((record) => record.id)
    .filter((id, index, all) => all.indexOf(id) === index);
  const parcelId = ids.length === 1 ? ids[0] : undefined;
  return {
    verdict: "mismatch",
    ...(parcelId ? { parcelId } : {}),
    attempt: situsAttempt(
      source,
      "no-match",
      conflicts > 0
        ? "A parcel at the searched point has this street address but a different city, ZIP or state."
        : `The parcel at the searched point${parcelId ? ` (${parcelId})` : ""} is published under a different street address.`,
    ),
  };
}

/** A parcel selected because its official situs address is the searched one. */
export interface AddressParcelResult extends CountyParcelResult {
  /** Official parcel identifier (APN/PIN) the address layer publishes for this parcel. */
  parcelId: string;
  /** A coordinate verified to lie inside {@link polygon}. */
  point: { lat: number; lng: number };
  /** Feet from the searched point to the parcel's boundary. */
  offsetFt: number;
  /**
   * False when the layer published neither a city nor a ZIP for the parcel, so
   * only the street line and the search window vouch for the match.
   */
  localityConfirmed: boolean;
  /** The attempt that produced the match, for provenance. */
  attempt: ProviderAttempt;
}

export interface AddressParcelLookup {
  parcel: AddressParcelResult | null;
  attempts: ProviderAttempt[];
}

/**
 * Find the parcel whose official situs address is the searched one, for the
 * case where the searched point fell on no parcel, or on a parcel published
 * under a different address.
 *
 * This is verification, not proximity: a parcel is accepted only when its own
 * published street line equals the searched house number and street, its
 * city/ZIP/state do not contradict the search, it carries an official parcel
 * identifier, and exactly one distinct parcel qualifies inside a
 * {@link ADDRESS_MATCH_RADIUS_FT} window. Two parcels claiming one address, a
 * truncated window, or a match outside the window are all refusals, never a
 * guess. Only sources with a registered address endpoint are asked; nothing is
 * inferred for the rest. Every outcome is reported as an attempt. Never throws.
 */
export async function fetchCountyParcelByAddress(
  lat: number,
  lng: number,
  address: StreetAddress,
  deadline: number = addressStageDeadline(),
): Promise<AddressParcelLookup> {
  const sources = sourcesCovering(lat, lng).filter(hasSitus);
  const attempts: ProviderAttempt[] = [];
  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    if (deadline - Date.now() <= 0) {
      attempts.push(
        situsAttempt(source, "timeout", "The address lookup ran out of its time budget."),
      );
      break;
    }
    const result = await queryAddressWindow(
      source,
      lat,
      lng,
      address,
      budgetFor(deadline, sources.length - index),
    );
    attempts.push(result.attempt);
    if (result.parcel) return { parcel: result.parcel, attempts };
    // Two parcels claiming one address is a data conflict, not something a
    // second layer may resolve.
    if (result.ambiguous) break;
  }
  return { parcel: null, attempts };
}

interface AddressWindowResult {
  parcel: AddressParcelResult | null;
  attempt: ProviderAttempt;
  ambiguous?: boolean;
}

interface AddressCandidate {
  feature: RawFeature;
  parcelId: string;
  parts: GeoJsonPolygon[];
  localityConfirmed: boolean;
}

/** Query one address layer's search window and pick the parcel whose situs matches. */
async function queryAddressWindow(
  source: SituatedSource,
  lat: number,
  lng: number,
  address: StreetAddress,
  timeoutMs: number,
): Promise<AddressWindowResult> {
  const dLat = ADDRESS_MATCH_RADIUS_FT / FT_PER_DEG_LAT;
  const dLng =
    ADDRESS_MATCH_RADIUS_FT / (FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  const params = new URLSearchParams({
    f: "geojson",
    geometry: [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outSR: "4326",
    outFields: situsOutFields(source.situs.fields),
  });

  const fetched = await fetchSitusFeatures(source, params, timeoutMs);
  if ("failure" in fetched) return { parcel: null, attempt: fetched.failure };
  const { features, truncated } = fetched;

  try {
    if (features.length === 0) {
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "no-match",
          "The service returned no parcels near the searched point.",
        ),
      };
    }
    if (truncated) {
      // A truncated window cannot prove that only one parcel has this address.
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "invalid-response",
          "Too many parcels near the searched point to verify a unique address match.",
        ),
      };
    }

    let publishing = 0;
    let conflicts = 0;
    let incompleteIdentity = false;
    let unusableMatchingGeometry = false;
    const byParcel = new Map<string, AddressCandidate[]>();
    for (const raw of features) {
      const record = readFeatureSitus(raw, source.situs.fields);
      if (!record) {
        // Vacant/unaddressed records and demonstrably different street lines
        // cannot publish this address. A matching situs without a PIN still
        // prevents uniqueness; do not invent an identifier to select it.
        const feature = raw as RawFeature | null;
        const published = feature && (
          readSitusAddress(feature.properties, source.situs.fields) ??
          readSitusAddress(feature.attributes, source.situs.fields)
        );
        if (published && compareSitus(address, published).verdict === "match") {
          incompleteIdentity = true;
        }
        continue;
      }
      publishing += 1;
      const { verdict, localityConfirmed } = compareSitus(address, record);
      if (verdict === "locality-conflict") conflicts += 1;
      if (verdict !== "match") continue;
      const group = byParcel.get(record.id) ?? [];
      // Count official matching identities before checking rendering geometry.
      // A missing polygon must not hide a second parcel claiming the address.
      byParcel.set(record.id, group);
      const feature = raw as RawFeature;
      const parts = normalizeParts(feature.geometry);
      if (parts.length === 0) {
        unusableMatchingGeometry = true;
        continue;
      }
      group.push({ feature, parcelId: record.id, parts, localityConfirmed });
    }

    if (publishing === 0) {
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "invalid-response",
          "The address layer returned parcels without a parcel identifier and street address.",
        ),
      };
    }
    if (incompleteIdentity) {
      return {
        parcel: null,
        attempt: situsAttempt(source, "invalid-response", "Some nearby parcels have incomplete identity; a unique address match could not be verified."),
      };
    }
    if (byParcel.size === 0) {
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "no-match",
          conflicts > 0
            ? "A nearby parcel has this street address but a different city, ZIP or state; no match was selected."
            : "No parcel near the searched point publishes this street address.",
        ),
      };
    }
    if (byParcel.size > 1) {
      return {
        parcel: null,
        ambiguous: true,
        attempt: situsAttempt(
          source,
          "invalid-response",
          "Multiple distinct parcels publish this street address near the searched point; no match was selected.",
        ),
      };
    }

    if (unusableMatchingGeometry) {
      return {
        parcel: null,
        attempt: situsAttempt(source, "invalid-response", "A matching parcel has unusable geometry; no address match was selected."),
      };
    }

    // One parcel. A multipart parcel may arrive as several features; use its
    // largest part and score it as multipart, like the point lookup does.
    const group = Array.from(byParcel.values())[0];
    let owner = group[0];
    let polygon = owner.parts[0];
    let selectedAreaSqft = -1;
    let partCount = 0;
    for (const candidate of group) {
      partCount += candidate.parts.length;
      for (const part of candidate.parts) {
        const area = partAreaSqft(part);
        if (area > selectedAreaSqft) {
          owner = candidate;
          polygon = part;
          selectedAreaSqft = area;
        }
      }
    }

    const offsetFt = distanceToPolygonFt(polygon, lng, lat);
    if (offsetFt > ADDRESS_MATCH_RADIUS_FT) {
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "no-match",
          "The parcel with this street address is farther from the searched point than the search window allows.",
        ),
      };
    }
    const point = interiorPoint(polygon);
    // Read the area from the address layer's own attribute, in the geometry
    // layer's unit. Without one, the returned polygon's hole-aware area is used.
    const result = buildParcelResult(
      { ...source, areaField: source.situs.fields.area },
      owner.feature,
      polygon,
      partCount,
      selectedAreaSqft,
    );
    if (!point || (result.lotAreaSqft ?? 0) <= 0) {
      return {
        parcel: null,
        attempt: situsAttempt(
          source,
          "invalid-response",
          "The matched parcel has no usable polygon or lot area.",
        ),
      };
    }

    const offset = Math.round(offsetFt);
    const attempt = situsAttempt(
      source,
      "matched",
      `Matched by official street address to parcel ${owner.parcelId}, ${offset} ft from the searched point.`,
    );
    return {
      parcel: {
        ...result,
        parcelId: owner.parcelId,
        point: { lat: point.lat, lng: point.lng },
        offsetFt: offset,
        localityConfirmed: owner.localityConfirmed,
        attempt,
      },
      attempt,
    };
  } catch {
    return {
      parcel: null,
      attempt: situsAttempt(source, "provider-error", "The provider response could not be read."),
    };
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
  /** Hole-aware area of {@link polygon} alone, not of every part. */
  selectedAreaSqft: number;
  containsPoint: boolean;
  /** Parts the feature carried, so callers can tell multipart from single. */
  partCount: number;
}

/**
 * Stacked layers (condos, vertical parcels) can return several features for
 * one point, and a feature can be multipart. Prefer the feature whose
 * geometry actually contains the point, then the largest; within a feature,
 * return the part containing the point (largest part as fallback).
 *
 * Ranking compares the part each feature would actually return rather than
 * its total across parts, so a feature is never chosen for area the caller
 * will not receive.
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
    const containing = parts.find((part) =>
      polygonContainsPoint(part, lng, lat),
    );
    const polygon =
      containing ??
      parts.reduce((a, b) => (partAreaSqft(b) > partAreaSqft(a) ? b : a));
    const selectedAreaSqft = partAreaSqft(polygon);
    const containsPoint = containing !== undefined;
    const beatsBest =
      !best ||
      (containsPoint && !best.containsPoint) ||
      (containsPoint === best.containsPoint &&
        selectedAreaSqft > best.selectedAreaSqft);
    if (beatsBest) {
      best = {
        feature,
        polygon,
        selectedAreaSqft,
        containsPoint,
        partCount: parts.length,
      };
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

/**
 * Read a statewide layer's county-name attribute, normalized the way
 * {@link CountyParcelResult} promises: no "County" suffix, trimmed.
 *
 * Rejects all-digit values, because several statewide layers put a FIPS code
 * in the field a name is expected in. Spelling still varies by publisher
 * (New York's layer spells its own county "NewYork"), so callers that have an
 * authoritative county — the Census geocoder — should prefer theirs.
 */
function readCountyField(
  properties: Record<string, unknown> | undefined,
  source: CountyGisSource,
): string | null {
  if (!source.countyField || !properties) return null;
  const raw = properties[source.countyField];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return null;
  return trimmed.replace(/\s+County$/i, "").trim() || null;
}

function roundedPositive(value: number): number | null {
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
