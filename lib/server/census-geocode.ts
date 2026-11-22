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
/**
 * Named explicitly, not left to the default set, so a response without an
 * `Incorporated Places` entry means the point is in no incorporated place
 * rather than that the layer was never asked for.
 */
const LAYERS = "States,Counties,Incorporated Places,Census Designated Places";
const TIMEOUT_MS = 4000;

export interface CensusLocation {
  /** Two-letter state, e.g. "WA". Empty when the lookup could not resolve it. */
  state: string;
  /** 5-digit ZIP. Empty unless an address match supplied one. */
  zip: string;
  /** County name without "County", e.g. "King". */
  county?: string;
  /** Incorporated place (city or town) at the point, e.g. "San Diego". Absent outside every one. */
  place?: string;
  /** Census Designated Place, an unincorporated community, e.g. "Spring Valley". */
  community?: string;
}

/**
 * Resolve state/ZIP/county for a searched location. Prefers the address
 * endpoint (it alone returns a ZIP) and falls back to the coordinate
 * endpoint, so a mistyped or unmatched address still yields state/county.
 *
 * Both attempts share one timeout budget so an address lookup that consumes
 * most of the deadline cannot add a second full timeout to the parcel route.
 *
 * @param input - The searched `lat`/`lng` and, when known, the address text.
 * @returns The resolved location, or null when neither endpoint matched.
 */
export async function fetchCensusLocation(input: {
  lat: number;
  lng: number;
  address?: string;
}): Promise<CensusLocation | null> {
  const deadline = Date.now() + TIMEOUT_MS;
  if (input.address) {
    const matched = await lookupByAddress(input.address, remainingBudget(deadline));
    // A ZIP-less match still beats the coordinate endpoint: it agreed with
    // the address text the user actually typed.
    if (matched) return matched;
  }
  const budget = remainingBudget(deadline);
  if (budget <= 0) return null;
  return await lookupByCoordinates(input.lat, input.lng, budget);
}

async function lookupByAddress(
  address: string,
  timeoutMs: number,
): Promise<CensusLocation | null> {
  if (timeoutMs <= 0) return null;
  const url = new URL(`${CENSUS_API}/onelineaddress`);
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", BENCHMARK);
  url.searchParams.set("vintage", VINTAGE);
  url.searchParams.set("layers", LAYERS);
  url.searchParams.set("format", "json");

  const json = await getJson(url, timeoutMs);
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
  timeoutMs: number,
): Promise<CensusLocation | null> {
  if (timeoutMs <= 0) return null;
  const url = new URL(`${CENSUS_API}/coordinates`);
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  url.searchParams.set("benchmark", BENCHMARK);
  url.searchParams.set("vintage", VINTAGE);
  url.searchParams.set("layers", LAYERS);
  url.searchParams.set("format", "json");

  const json = await getJson(url, timeoutMs);
  const location = readGeographies(json?.result?.geographies);
  // The coordinate endpoint carries no ZIP; callers fall back to the ZIP
  // parsed out of the searched address.
  return location ? { ...location, zip: "" } : null;
}

/**
 * Pull the state abbreviation, county name and place names out of a
 * geographies bag. Returns null without a state — a county alone cannot key
 * the market index.
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
  const place = placeName(bag["Incorporated Places"]);
  const community = placeName(bag["Census Designated Places"]);

  return {
    state,
    county,
    ...(place ? { place } : {}),
    ...(community ? { community } : {}),
  };
}

/**
 * A place layer's first match, by BASENAME ("San Diego"), not NAME, which
 * carries the legal suffix ("San Diego city", "Spring Valley CDP").
 */
function placeName(layer: unknown): string | undefined {
  const record = asArray(layer)[0] as Record<string, unknown> | undefined;
  const name = String(record?.BASENAME ?? "").trim();
  return name || undefined;
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

function remainingBudget(deadline: number): number {
  return Math.max(0, deadline - Date.now());
}

/** Fetch and parse JSON under a timeout; null on any failure. */
async function getJson(
  url: URL,
  timeoutMs: number,
): Promise<GeocoderResponse | null> {
  if (timeoutMs <= 0) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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
