/**
 * Free, keyless state/ZIP/county lookup from the US Census Geocoder — the
 * structured location the market index keys on, without spending a paid
 * parcel record to get it. Server-only: never import into client bundles.
 *
 * Two public, unauthenticated endpoints back this:
 *   - `onelineaddress` matches a street address and returns the canonical
 *     match, including the ZIP — the only one of the two that carries it.
 *   - `coordinates` reverse-looks-up state/county from a point, so a lookup
 *     still resolves when the caller has no address text.
 *
 * Coverage is the US, Puerto Rico, and the US Island Areas. Every failure
 * path returns null: the geocoder is an optimization over Regrid's location
 * fields, never a hard dependency.
 */

const CENSUS_API = "https://geocoding.geo.census.gov/geocoder/geographies";
const BENCHMARK = "Public_AR_Current";
const VINTAGE = "Current_Current";
const TIMEOUT_MS = 4000;

export interface CensusLocation {
  /** Two-letter state, e.g. "WA". Empty when the lookup could not resolve it. */
  state: string;
  /** 5-digit ZIP. Empty unless an address match supplied one. */
  zip: string;
  /** County name without "County", e.g. "King". */
  county?: string;
}

/**
 * Resolve state/ZIP/county for a searched location. Prefers the address
 * endpoint (it alone returns a ZIP) and falls back to the coordinate
 * endpoint, so a mistyped or unmatched address still yields state/county.
 *
 * @param input - The searched `lat`/`lng` and, when known, the address text.
 * @returns The resolved location, or null when neither endpoint matched.
 */
export async function fetchCensusLocation(input: {
  lat: number;
  lng: number;
  address?: string;
}): Promise<CensusLocation | null> {
  if (input.address) {
    const matched = await lookupByAddress(input.address);
    // A ZIP-less match still beats the coordinate endpoint: it agreed with
    // the address text the user actually typed.
    if (matched) return matched;
  }
  return await lookupByCoordinates(input.lat, input.lng);
}

async function lookupByAddress(address: string): Promise<CensusLocation | null> {
  const url = new URL(`${CENSUS_API}/onelineaddress`);
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", BENCHMARK);
  url.searchParams.set("vintage", VINTAGE);
  url.searchParams.set("format", "json");

  const json = await getJson(url);
  const match = asArray(json?.result?.addressMatches)[0];
  if (!match || typeof match !== "object") return null;

  const record = match as {
    matchedAddress?: unknown;
    geographies?: unknown;
  };
  const location = readGeographies(record.geographies);
  if (!location) return null;
  return { ...location, zip: zipFromMatchedAddress(record.matchedAddress) };
}

async function lookupByCoordinates(
  lat: number,
  lng: number,
): Promise<CensusLocation | null> {
  const url = new URL(`${CENSUS_API}/coordinates`);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", BENCHMARK);
  url.searchParams.set("vintage", VINTAGE);
  url.searchParams.set("format", "json");

  const json = await getJson(url);
  const location = readGeographies(json?.result?.geographies);
  // The coordinate endpoint carries no ZIP; callers fall back to the ZIP
  // parsed out of the searched address.
  return location ? { ...location, zip: "" } : null;
}

/**
 * Pull the state abbreviation and county name out of a geographies bag.
 * Returns null without a state — a county alone cannot key the market index.
 */
function readGeographies(
  geographies: unknown,
): Omit<CensusLocation, "zip"> | null {
  if (!geographies || typeof geographies !== "object") return null;
  const bag = geographies as Record<string, unknown>;

  const stateRecord = asArray(bag.States)[0] as
    | Record<string, unknown>
    | undefined;
  const state = String(stateRecord?.STUSAB ?? "").trim().toUpperCase();
  if (!state) return null;

  const countyRecord = asArray(bag.Counties)[0] as
    | Record<string, unknown>
    | undefined;
  // BASENAME already omits the "County" suffix that NAME carries; strip it
  // anyway so either field keys the market index's `ST/County` rows.
  const rawCounty = String(
    countyRecord?.BASENAME ?? countyRecord?.NAME ?? "",
  ).trim();
  const county = rawCounty
    ? rawCounty.replace(/\s+County$/i, "").trim() || undefined
    : undefined;

  return { state, county };
}

/**
 * The Census returns a canonical match as "STREET, CITY, ST, ZIP", so the
 * ZIP is the trailing comma-separated field. Anything else yields "".
 */
function zipFromMatchedAddress(matchedAddress: unknown): string {
  if (typeof matchedAddress !== "string") return "";
  const last = matchedAddress.split(",").pop()?.trim() ?? "";
  return /^\d{5}$/.test(last) ? last : "";
}

/** Fetch and parse JSON under a timeout; null on any failure. */
async function getJson(url: URL): Promise<GeocoderResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) return null;
      // Keep the abort timer armed through the body read so a stalled stream
      // trips the same bound as stalled headers.
      return (await res.json()) as GeocoderResponse;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

interface GeocoderResponse {
  result?: {
    addressMatches?: unknown;
    geographies?: unknown;
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
