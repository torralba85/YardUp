import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";

const GOOGLE_GEOCODE_API = "https://maps.googleapis.com/maps/api/geocode/json";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 5000;
const MAX_QUERY_LEN = 200;
const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export const runtime = "nodejs";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * GET /api/geocode?q={address}
 *
 * Resolves a free-text US address to coordinates so the studio can look up a
 * parcel without the client-side Google Places widget. Prefers Google
 * Geocoding when the server-side Maps key is configured; otherwise (and as a
 * fallback if Google returns nothing) uses keyless Nominatim. Returns 404 when
 * no provider can resolve it.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, {
    limit: 30,
    namespace: "geocode",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json(
      { error: "q query param is required" },
      { status: 400 },
    );
  }
  const query = q.slice(0, MAX_QUERY_LEN);

  const googleKey =
    process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_MAPS_API_KEY;
  let result: GeocodeResult | null = null;

  if (googleKey) {
    result = await geocodeWithGoogle(query, googleKey);
  }
  if (!result) {
    result = await geocodeWithNominatim(query);
  }

  if (!result) {
    return NextResponse.json(
      { error: "No match found for that address" },
      { status: 404 },
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

async function geocodeWithGoogle(
  query: string,
  key: string,
): Promise<GeocodeResult | null> {
  try {
    const url = new URL(GOOGLE_GEOCODE_API);
    url.searchParams.set("address", query);
    url.searchParams.set("components", "country:US");
    url.searchParams.set("key", key);

    const json = (await fetchJson(url.toString())) as {
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };
    const first = json?.results?.[0];
    const loc = first?.geometry?.location;
    if (!first || typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      return null;
    }
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: first.formatted_address ?? query,
    };
  } catch (err) {
    console.error("[/api/geocode] Google geocode failed:", err);
    return null;
  }
}

async function geocodeWithNominatim(
  query: string,
): Promise<GeocodeResult | null> {
  try {
    const url = new URL(NOMINATIM_API);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("addressdetails", "0");

    // Nominatim's usage policy requires an identifying User-Agent.
    const json = (await fetchJson(url.toString(), {
      headers: { "User-Agent": "LotFoundry/1.0 (ADU feasibility demo)" },
    })) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = Array.isArray(json) ? json[0] : null;
    const lat = Number.parseFloat(first?.lat ?? "");
    const lng = Number.parseFloat(first?.lon ?? "");
    if (
      !first ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      !matchesRequestedState(query, first.display_name)
    ) {
      return null;
    }
    return {
      lat,
      lng,
      formattedAddress: first.display_name ?? query,
    };
  } catch (err) {
    console.error("[/api/geocode] Nominatim geocode failed:", err);
    return null;
  }
}

function matchesRequestedState(query: string, displayName?: string): boolean {
  const statePattern = /(?:^|[\s,])([A-Z]{2})(?=[\s,]|$)/gi;
  let stateCode: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = statePattern.exec(query)) !== null) {
    const candidate = match[1].toUpperCase();
    if (US_STATE_NAMES[candidate]) {
      stateCode = candidate;
      break;
    }
  }
  if (!stateCode) return true;

  const stateName = US_STATE_NAMES[stateCode];
  if (!stateName || !displayName) return true;

  const normalizedDisplay = displayName.toLowerCase();
  return (
    normalizedDisplay.includes(stateName.toLowerCase()) ||
    new RegExp(`(?:^|[\\s,])${stateCode.toLowerCase()}(?:[\\s,]|$)`).test(
      normalizedDisplay,
    )
  );
}

async function fetchJson(
  url: string,
  init?: { headers?: Record<string, string> },
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`Geocode provider returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
