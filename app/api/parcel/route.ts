import { type NextRequest, NextResponse } from "next/server";
import type { LiveParcelData } from "@/lib/parcel-types";
import { parcelPresets } from "@/lib/feasibility";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const REGRID_API = "https://app.regrid.com/api/v2/query.json";
const TIMEOUT_MS = 5000;

export const runtime = "nodejs";

/** Rough R-1 fallback setbacks used when Regrid has no zoning data. */
const DEFAULT_SETBACKS = { front: 20, rear: 20, side: 5 };

/**
 * GET /api/parcel?lat={lat}&lng={lng}&address={searched address}
 *
 * Looks up parcel data from Regrid by lat/lng. Returns a LiveParcelData object.
 * Falls back to the nearest preset's lot stats if Regrid is unavailable or
 * returns no data, keeping the searched address (when provided) so the user's
 * location is never replaced by a preset's.
 * Responses are cached for 24 hours (parcel data doesn't change frequently).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  const limited = checkRateLimit(request, {
    limit: 60,
    namespace: "parcel",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const coordinates = parseCoordinateParams(searchParams);
  if (coordinates instanceof NextResponse) return coordinates;
  const { lat, lng } = coordinates;

  const searched = parseSearchedAddress(searchParams.get("address"));

  const regridKey = process.env.REGRID_API_KEY;
  if (!regridKey) {
    return NextResponse.json(
      { error: "Parcel service not configured" },
      { status: 500 },
    );
  }

  try {
    const url = new URL(REGRID_API);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("token", regridKey);
    url.searchParams.set("limit", "1");
    url.searchParams.set("fields", "ll_gisacre,ll_bldg_footprint_sqft,sqft,zoning,saddress,scity,state2,szip5,address,city,state,zip");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let regridRes: Response;
    try {
      regridRes = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (regridRes.status === 429) {
      return NextResponse.json(
        { error: "Rate limit reached — please try again shortly" },
        {
          status: 503,
          headers: { "Retry-After": "10" },
        },
      );
    }

    if (!regridRes.ok) {
      throw new Error(`Regrid returned ${regridRes.status}`);
    }

    const json = await regridRes.json();
    const parcels = json?.results?.features ?? [];
    if (parcels.length === 0) {
      return successWithFallback(lat, lng, searched);
    }

    const feature = parcels[0];
    const fields = feature?.properties?.fields ?? {};
    const geometry = feature?.geometry ?? null;

    const lotAreaSqft = fields.ll_gisacre
      ? Math.round(fields.ll_gisacre * 43560)
      : 5000;

    const existingHouseSqft =
      fields.ll_bldg_footprint_sqft ?? fields.sqft ?? 0;

    // Derive approximate lot width/length from bounding box if not explicit
    const { lotWidth, lotLength } = deriveWidthLength(lotAreaSqft, geometry);

    // Regrid's standard parcel schema does not include zoning setbacks, so
    // this resolves to DEFAULT_SETBACKS. Kept as a single seam so a future
    // zoning data source can populate setbacks without touching the mapper.
    const setbacks = parseSetbacks(fields.zoning_setbacks);

    const parcelData: LiveParcelData = {
      address: formatAddress(fields, searched, lat, lng),
      city: formatCity(fields) || (searched?.city ?? ""),
      lotArea: lotAreaSqft,
      lotWidth,
      lotLength,
      existingHouseSqft: Math.round(existingHouseSqft),
      maxLotCoveragePercent: deriveMaxCoverage(fields.zoning),
      setbacks,
      zoning: fields.zoning ?? "Unknown",
      boundaryGeoJson:
        geometry?.type === "Polygon" ? geometry : null,
      lat,
      lng,
      source: "regrid",
    };

    return NextResponse.json(parcelData, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[/api/parcel] Regrid fetch failed:", err);
    return successWithFallback(lat, lng, searched);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_ADDRESS_LENGTH = 200;

interface SearchedAddress {
  address: string;
  city: string;
}

/**
 * Splits the optional `address` query param (the address the user searched,
 * e.g. Google's formatted_address "123 Main St, San Jose, CA 95110, USA")
 * into street + city parts so fallback responses keep the user's real
 * location instead of substituting a preset's.
 */
function parseSearchedAddress(raw: string | null): SearchedAddress | null {
  const trimmed = raw?.trim().slice(0, MAX_ADDRESS_LENGTH);
  if (!trimmed) return null;
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const country = parts[parts.length - 1].toLowerCase();
  if (country === "usa" || country === "united states") parts.pop();
  if (parts.length === 0) return null;
  return { address: parts[0], city: parts.slice(1).join(", ") };
}

function successWithFallback(
  lat: number,
  lng: number,
  searched: SearchedAddress | null,
): NextResponse {
  const preset = nearestPreset(lat, lng);
  const fallback: LiveParcelData = {
    address: searched?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: searched?.city ?? "",
    lotArea: preset.lotArea,
    lotWidth: preset.lotWidth,
    lotLength: preset.lotLength,
    existingHouseSqft: preset.existingHouseSqft,
    maxLotCoveragePercent: preset.maxLotCoveragePercent,
    setbacks: preset.setbacks,
    zoning: "R-1 (estimated)",
    boundaryGeoJson: null,
    lat,
    lng,
    source: "fallback",
  };
  return NextResponse.json(fallback, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

/**
 * Pick the closest preset by rough Euclidean lat/lng distance.
 * (Good enough for coarse region matching; not geodesically precise.)
 */
function nearestPreset(lat: number, lng: number) {
  // Known approximate centers for our presets
  const centers: { id: string; lat: number; lng: number }[] = [
    { id: "oak-street", lat: 47.68, lng: -122.29 },   // Seattle
    { id: "corner-lot", lat: 45.54, lng: -122.63 },   // Portland
    { id: "compact-lot", lat: 30.25, lng: -97.75 },   // Austin
  ];

  let bestId = "oak-street";
  let bestDist = Infinity;
  for (const c of centers) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestId = c.id;
    }
  }
  return parcelPresets.find((p) => p.id === bestId) ?? parcelPresets[0];
}

function deriveWidthLength(
  lotAreaSqft: number,
  geometry: { type: string; coordinates: number[][][] } | null,
): { lotWidth: number; lotLength: number } {
  if (geometry?.type === "Polygon" && geometry.coordinates[0]?.length > 0) {
    const coords = geometry.coordinates[0];
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);
    const dLat = Math.max(...lats) - Math.min(...lats);
    const dLng = Math.max(...lngs) - Math.min(...lngs);
    // Convert degrees to approximate feet (1° lat ≈ 364_000 ft, 1° lng ≈ 288_000 ft at 38°N)
    const heightFt = dLat * 364000;
    const widthFt = dLng * 288000;
    return {
      lotWidth: Math.round(Math.min(widthFt, heightFt)),
      lotLength: Math.round(Math.max(widthFt, heightFt)),
    };
  }
  // Fallback: assume 40ft wide lot
  const width = 40;
  return { lotWidth: width, lotLength: Math.round(lotAreaSqft / width) };
}

function parseSetbacks(
  raw: Record<string, number> | null | undefined,
): { front: number; rear: number; side: number } {
  if (!raw) return DEFAULT_SETBACKS;
  return {
    front: raw.front ?? raw.front_setback ?? DEFAULT_SETBACKS.front,
    rear: raw.rear ?? raw.rear_setback ?? DEFAULT_SETBACKS.rear,
    side: raw.side ?? raw.side_setback ?? DEFAULT_SETBACKS.side,
  };
}

function deriveMaxCoverage(zoning?: string): number {
  if (!zoning) return 40;
  const z = zoning.toUpperCase();
  if (z.includes("R1") || z.includes("R-1")) return 40;
  if (z.includes("R2") || z.includes("R-2")) return 45;
  if (z.includes("R3") || z.includes("R-3")) return 50;
  if (z.includes("MF") || z.includes("RM")) return 55;
  return 40;
}

function formatAddress(
  fields: Record<string, string | number | undefined>,
  searched: SearchedAddress | null,
  lat: number,
  lng: number,
): string {
  // Regrid returns the full street address in the `saddress` (Situs Address) or fallback `address` field.
  // Fall back to the searched address, then to coordinates, if it's missing.
  const address = fields.saddress ?? fields.address;
  if (address) return String(address).trim();
  if (searched) return searched.address;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatCity(
  fields: Record<string, string | number | undefined>,
): string {
  const city = fields.scity ?? fields.city ?? "";
  const state = fields.state2 ?? fields.state ?? "";
  const zip = fields.szip5 ?? fields.zip ?? "";
  if (city && state) return `${city}, ${state} ${zip}`.trim();
  return String(city || "");
}
