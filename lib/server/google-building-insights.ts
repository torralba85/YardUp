/**
 * Server-only Google Maps Platform building geometry enrichment:
 * 1. Geocoding API v4 `destinations` (`displayPolygon` building outlines + entrance coordinates)
 * 2. Solar API `buildingInsights:findClosest` (observed roof pitch, azimuth, and ground area)
 *
 * Compliance & quota rules:
 * - Every request includes `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`.
 * - Responses are used transiently in-request (`cache: "no-store"`) and never
 *   cached or persisted outside permitted temporary rules.
 * - Never invoke for anonymous guest requests; callers must check `isGuestRequest`.
 */
import type { ExistingBuildingGeometry, GeoJsonPolygon } from "@/lib/parcel-types";
import { interiorPoint, polygonAreaSqft, polygonContainsPoint } from "@/lib/parcel-geometry";

const GEOCODE_DESTINATIONS_URL = "https://geocode.googleapis.com/v4/geocode/destinations";
const SOLAR_BUILDING_INSIGHTS_URL = "https://solar.googleapis.com/v1/buildingInsights:findClosest";
const GMP_SOLUTION_ID = "gmp_git_agentskills_v1";
const DESTINATIONS_FIELD_MASK = [
  "destinations.primary.place",
  "destinations.primary.formattedAddress",
  "destinations.primary.structureType",
  "destinations.primary.displayPolygon",
  "destinations.containingPlaces.place",
  "destinations.containingPlaces.structureType",
  "destinations.containingPlaces.displayPolygon",
  "destinations.entrances",
].join(",");
const SQM_TO_SQFT = 10.7639104;
const DEFAULT_TIMEOUT_MS = 3500;

export interface GoogleBuildingLookupParams {
  lat: number;
  lng: number;
  apiKey: string;
  parcelPolygon?: GeoJsonPolygon | null;
  timeoutMs?: number;
}

export interface GoogleBuildingOutlineResult {
  outlineGeoJson: GeoJsonPolygon;
  footprintSqft: number | null;
  entranceLatLng: { lat: number; lng: number } | null;
}

export interface GoogleSolarRoofResult {
  roofPitchDegrees: number | null;
  roofAzimuthDegrees: number | null;
  footprintSqft: number | null;
}

/**
 * Fetch the primary building footprint polygon and entrance coordinate from
 * Google Geocoding API v4 `destinations`.
 */
export async function fetchGoogleBuildingOutline(
  params: GoogleBuildingLookupParams,
): Promise<GoogleBuildingOutlineResult | null> {
  const { lat, lng, apiKey, parcelPolygon, timeoutMs = DEFAULT_TIMEOUT_MS } = params;
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GEOCODE_DESTINATIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DESTINATIONS_FIELD_MASK,
        "X-Goog-Maps-Solution-ID": GMP_SOLUTION_ID,
      },
      body: JSON.stringify({
        locationQuery: {
          location: { latitude: lat, longitude: lng },
          placeFilter: {
            structureType: "BUILDING",
            addressability: "ANY",
          },
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      destinations?: Array<{
        primary?: {
          structureType?: string;
          displayPolygon?: unknown;
        };
        containingPlaces?: Array<{
          structureType?: string;
          displayPolygon?: unknown;
        }>;
        entrances?: Array<{
          location?: { latitude?: unknown; longitude?: unknown };
        }>;
      }>;
    };

    const dest = data?.destinations?.[0];
    if (!dest) return null;

    const primaryPoly = parseDisplayPolygon(dest.primary?.displayPolygon);
    const containingPoly =
      primaryPoly ??
      dest.containingPlaces
        ?.map((place) => parseDisplayPolygon(place?.displayPolygon))
        .find((poly): poly is GeoJsonPolygon => poly !== null) ??
      null;

    if (!containingPoly) return null;

    if (parcelPolygon && !buildingMatchesParcel(containingPoly, parcelPolygon)) {
      return null;
    }

    const entranceLoc = dest.entrances?.[0]?.location;
    const entranceLat = typeof entranceLoc?.latitude === "number" ? entranceLoc.latitude : null;
    const entranceLng = typeof entranceLoc?.longitude === "number" ? entranceLoc.longitude : null;
    const entranceLatLng =
      entranceLat !== null &&
      entranceLng !== null &&
      Number.isFinite(entranceLat) &&
      Number.isFinite(entranceLng)
        ? { lat: entranceLat, lng: entranceLng }
        : null;

    const areaSqFt = Math.round(polygonAreaSqft(containingPoly));

    return {
      outlineGeoJson: containingPoly,
      footprintSqft: areaSqFt > 0 ? areaSqFt : null,
      entranceLatLng,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch roof pitch, predominant azimuth, and ground footprint area from
 * Google Solar API `buildingInsights:findClosest`.
 */
export async function fetchGoogleSolarBuildingInsights(
  params: GoogleBuildingLookupParams,
): Promise<GoogleSolarRoofResult | null> {
  const { lat, lng, apiKey, parcelPolygon, timeoutMs = DEFAULT_TIMEOUT_MS } = params;
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const query = new URLSearchParams({
    "location.latitude": String(lat),
    "location.longitude": String(lng),
    requiredQuality: "BASE",
    key: apiKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${SOLAR_BUILDING_INSIGHTS_URL}?${query.toString()}`, {
      method: "GET",
      headers: {
        "X-Goog-Maps-Solution-ID": GMP_SOLUTION_ID,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      center?: { latitude?: unknown; longitude?: unknown };
      solarPotential?: {
        wholeRoofStats?: { groundAreaMeters2?: unknown };
        buildingStats?: { groundAreaMeters2?: unknown };
        roofSegmentStats?: Array<{
          pitchDegrees?: unknown;
          azimuthDegrees?: unknown;
          stats?: { groundAreaMeters2?: unknown };
        }>;
      };
    };

    if (parcelPolygon) {
      const centerLat = typeof data?.center?.latitude === "number" ? data.center.latitude : null;
      const centerLng = typeof data?.center?.longitude === "number" ? data.center.longitude : null;
      if (
        centerLat !== null &&
        centerLng !== null &&
        Number.isFinite(centerLat) &&
        Number.isFinite(centerLng) &&
        !polygonContainsPoint(parcelPolygon, centerLng, centerLat)
      ) {
        return null;
      }
    }

    const solar = data?.solarPotential;
    if (!solar) return null;

    const rawGroundM2 =
      typeof solar.buildingStats?.groundAreaMeters2 === "number"
        ? solar.buildingStats.groundAreaMeters2
        : typeof solar.wholeRoofStats?.groundAreaMeters2 === "number"
          ? solar.wholeRoofStats.groundAreaMeters2
          : null;
    const footprintSqft =
      rawGroundM2 !== null && Number.isFinite(rawGroundM2) && rawGroundM2 > 0
        ? Math.round(rawGroundM2 * SQM_TO_SQFT)
        : null;

    const segments = Array.isArray(solar.roofSegmentStats) ? solar.roofSegmentStats : [];
    let weightedPitchSum = 0;
    let totalWeight = 0;
    let largestSegmentWeight = -1;
    let dominantAzimuth: number | null = null;

    for (const seg of segments) {
      const pitch = typeof seg?.pitchDegrees === "number" && Number.isFinite(seg.pitchDegrees) ? seg.pitchDegrees : null;
      const azimuth =
        typeof seg?.azimuthDegrees === "number" && Number.isFinite(seg.azimuthDegrees)
          ? seg.azimuthDegrees
          : null;
      const weight =
        typeof seg?.stats?.groundAreaMeters2 === "number" &&
        Number.isFinite(seg.stats.groundAreaMeters2) &&
        seg.stats.groundAreaMeters2 > 0
          ? seg.stats.groundAreaMeters2
          : 1;

      if (pitch !== null && pitch >= 0 && pitch <= 75) {
        weightedPitchSum += pitch * weight;
        totalWeight += weight;
      }
      if (azimuth !== null && weight > largestSegmentWeight) {
        largestSegmentWeight = weight;
        dominantAzimuth = ((azimuth % 360) + 360) % 360;
      }
    }

    const roofPitchDegrees =
      totalWeight > 0 ? Math.round((weightedPitchSum / totalWeight) * 10) / 10 : null;

    if (roofPitchDegrees === null && dominantAzimuth === null && footprintSqft === null) {
      return null;
    }

    return {
      roofPitchDegrees,
      roofAzimuthDegrees: dominantAzimuth !== null ? Math.round(dominantAzimuth * 10) / 10 : null,
      footprintSqft,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Combine Google Geocoding v4 Building Outline and Solar API roof insights into
 * a single `ExistingBuildingGeometry` payload.
 */
export async function fetchGoogleBuildingGeometry(
  params: GoogleBuildingLookupParams,
): Promise<ExistingBuildingGeometry | null> {
  const [outlineOutcome, solarOutcome] = await Promise.allSettled([
    fetchGoogleBuildingOutline(params),
    fetchGoogleSolarBuildingInsights(params),
  ]);

  const outline = outlineOutcome.status === "fulfilled" ? outlineOutcome.value : null;
  const solar = solarOutcome.status === "fulfilled" ? solarOutcome.value : null;

  if (!outline && !solar) return null;

  return {
    outlineGeoJson: outline?.outlineGeoJson ?? null,
    roofPitchDegrees: solar?.roofPitchDegrees ?? null,
    roofAzimuthDegrees: solar?.roofAzimuthDegrees ?? null,
    footprintSqft: outline?.footprintSqft ?? solar?.footprintSqft ?? null,
    entranceLatLng: outline?.entranceLatLng ?? null,
    geometrySource: outline?.outlineGeoJson ? "google-geocoding-v4" : "google-solar",
  };
}

function parseDisplayPolygon(raw: unknown): GeoJsonPolygon | null {
  if (!raw || typeof raw !== "object") return null;
  const poly = raw as { type?: unknown; coordinates?: unknown };
  if (poly.type !== "Polygon" || !Array.isArray(poly.coordinates) || poly.coordinates.length === 0) {
    return null;
  }

  const validRings: number[][][] = [];
  for (const ring of poly.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) continue;
    const pts: number[][] = [];
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const lng = typeof pt[0] === "number" ? pt[0] : Number(pt[0]);
      const lat = typeof pt[1] === "number" ? pt[1] : Number(pt[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      pts.push([lng, lat]);
    }
    if (pts.length >= 4) {
      validRings.push(pts);
    }
  }

  if (validRings.length === 0) return null;
  return {
    type: "Polygon",
    coordinates: validRings,
  };
}

function buildingMatchesParcel(building: GeoJsonPolygon, parcel: GeoJsonPolygon): boolean {
  const pt = interiorPoint(building);
  if (pt && polygonContainsPoint(parcel, pt.lng, pt.lat)) {
    return true;
  }
  const ring = building.coordinates[0] ?? [];
  return ring.some(([lng, lat]) => polygonContainsPoint(parcel, lng, lat));
}
