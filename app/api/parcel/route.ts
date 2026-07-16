import { type NextRequest, NextResponse } from "next/server";
import type { LiveParcelData } from "@/lib/parcel-types";
import { parcelPresets } from "@/lib/feasibility";
import { extractZip, parseParcelCityState } from "@/lib/marketplace";
import { estimateLotDimensions, orientedLotDimensions } from "@/lib/parcel-geometry";
import { resolveMarketData } from "@/lib/server/market/resolve-market";
import { extractRegridLocation } from "@/lib/server/parcel-location";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const REGRID_API = "https://app.regrid.com/api/v2/query.json";
const TIMEOUT_MS = 5000;

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Rough R-1 fallback setbacks used when Regrid has no zoning data. */
const DEFAULT_SETBACKS = { front: 20, rear: 20, side: 5 };

/**
 * GET /api/parcel?lat={lat}&lng={lng}
 *
 * Looks up parcel data from Regrid by lat/lng. Returns a LiveParcelData object.
 * Falls back to typical estimates if Regrid is unavailable or returns no data.
 * Responses are cached for 24 hours (parcel data doesn't change frequently).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const limited = checkRateLimit(request, {
    limit: 60,
    namespace: "parcel",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const coordinates = parseCoordinateParams(searchParams);
  if (coordinates instanceof NextResponse) return coordinates;
  const { lat, lng } = coordinates;
  const requestedAddress = sanitizeAddress(searchParams.get("address"));

  const regridKey = process.env.REGRID_API_KEY;
  if (!regridKey) {
    // Keyless demo: no Regrid configured. Keep the searched address visible
    // while using the nearest preset's typical dimensions/assumptions.
    return await successWithFallback(lat, lng, requestedAddress);
  }

  try {
    const url = new URL(REGRID_API);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("token", regridKey);
    url.searchParams.set("limit", "1");
    url.searchParams.set("fields", "ll_gisacre,ll_bldg_footprint_sqft,sqft,zoning,saddress,scity,state2,szip5,county,scounty,address,city,state,zip");

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
      return await successWithFallback(lat, lng, requestedAddress);
    }

    const feature = parcels[0];
    const fields = feature?.properties?.fields ?? {};
    const geometry = feature?.geometry ?? null;

    const lotAreaSqft = fields.ll_gisacre
      ? Math.round(fields.ll_gisacre * 43560)
      : 5000;

    const existingHouseSqft =
      fields.ll_bldg_footprint_sqft ?? fields.sqft ?? 0;

    // Prefer the real parcel shape's oriented bounding box (latitude-corrected,
    // rotation-proof); otherwise estimate proportions from lot area so the 3D
    // lot still responds to the address instead of assuming a 40 ft width.
    const { lotWidth, lotLength } =
      orientedLotDimensions(
        geometry?.type === "Polygon" ? geometry : null,
        lotAreaSqft,
      ) ?? estimateLotDimensions(lotAreaSqft);

    // Regrid's standard parcel schema does not include zoning setbacks, so
    // this resolves to DEFAULT_SETBACKS. Kept as a single seam so a future
    // zoning data source can populate setbacks without touching the mapper.
    const setbacks = parseSetbacks(fields.zoning_setbacks);

    // Financial figures must resolve to the address's own market — the
    // Regrid location fields feed the server-side market index directly.
    const loc = extractRegridLocation(fields);
    const marketData = await resolveMarketData({ lat, lng, ...loc });

    const parcelData: LiveParcelData = {
      address: formatAddress(fields, requestedAddress, lat, lng),
      city: formatCity(fields) || cityFromRequestedAddress(requestedAddress),
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
      state: loc.state,
      zip: loc.zip,
      county: loc.county,
      marketData,
    };

    return NextResponse.json(parcelData, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[/api/parcel] Regrid fetch failed:", err);
    return await successWithFallback(lat, lng, requestedAddress);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function successWithFallback(
  lat: number,
  lng: number,
  requestedAddress?: string,
): Promise<NextResponse> {
  const preset = nearestPreset(lat, lng);
  const location = formatFallbackLocation(requestedAddress, preset);
  // The preset only lends typical *dimensions*. Financial market data must
  // still resolve from the searched address's own geography — a California
  // address must never inherit Seattle/Portland/Austin economics just
  // because the parcel lookup fell back.
  const area = requestedAddress ? parseParcelCityState(location.city) : null;
  const zip = requestedAddress ? extractZip(requestedAddress) : "";
  const marketData = await resolveMarketData({
    lat,
    lng,
    zip: zip || undefined,
    state: area?.state || undefined,
  });
  const fallback: LiveParcelData = {
    address: location.address,
    city: location.city,
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
    state: area?.state ?? "",
    zip,
    marketData,
  };
  return NextResponse.json(fallback, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

function sanitizeAddress(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 240);
}

function formatFallbackLocation(
  requestedAddress: string | undefined,
  preset: (typeof parcelPresets)[number],
): { address: string; city: string } {
  if (!requestedAddress) {
    return { address: preset.address, city: preset.city };
  }

  const [street, ...rest] = requestedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!street) {
    return { address: requestedAddress, city: preset.city };
  }

  return {
    address: street,
    city: rest.join(", ") || preset.city,
  };
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
  requestedAddress: string | undefined,
  lat: number,
  lng: number,
): string {
  // Regrid returns the full street address in the `saddress` (Situs Address) or fallback `address` field.
  // Fall back to the searched address, then to coordinates, if it's missing.
  const address = fields.saddress ?? fields.address;
  if (address) return String(address).trim();
  const street = requestedAddress?.split(",")[0]?.trim();
  if (street) return street;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function cityFromRequestedAddress(requestedAddress: string | undefined): string {
  if (!requestedAddress) return "";
  const parts = requestedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(1).join(", ");
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
