import { type NextRequest, NextResponse } from "next/server";
import {
  isGeocodePickerEnabled,
  pickGeocodeCandidate,
} from "@/lib/server/geocode-candidate-picker";
import { stripUnitDesignators } from "@/lib/server/geocode-query";
import { isGuestRequest } from "@/lib/server/guest-request";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseStreetAddress } from "@/lib/server/address-match";
import type { DataEvidence } from "@/lib/data-evidence";

const GOOGLE_GEOCODE_API = "https://maps.googleapis.com/maps/api/geocode/json";
const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 5000;
const MAX_QUERY_LEN = 200;
const PICKER_CANDIDATE_LIMIT = 5;
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

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Shape of a successful `/api/geocode` response. */
export interface GeocodeResult {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** The provider's normalized, human-readable address. */
  formattedAddress: string;
  /** Provider match evidence used to decide whether this point is safe. */
  match: GeocodeMatch;
}

export interface GeocodeMatch {
  provider: "google" | "nominatim";
  providerId?: string;
  matchType: string;
  precision:
    | "rooftop"
    | "range-interpolated"
    | "address"
    | "street"
    | "locality"
    | "unknown";
  partialMatch: boolean;
  components: {
    houseNumber?: string;
    road?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  evidence: DataEvidence;
}

/**
 * GET /api/geocode?q={address}
 *
 * Resolves a free-text US address to coordinates so the studio can look up a
 * parcel without the client-side Google Places widget. Prefers Google
 * Geocoding when the server-side Maps key is configured; otherwise (and as a
 * fallback if Google returns nothing) uses keyless Nominatim. Requests without
 * a bearer token skip Google entirely and resolve through Nominatim, so an
 * anonymous lookup costs nothing. Returns 404 when no provider can resolve it.
 */
export async function GET(request: NextRequest) {
  // Anonymous visitors resolve through keyless Nominatim only. The landing
  // funnel lets a guest look up one real address before signing in, and that
  // lookup must not be able to spend metered Google Geocoding quota.
  const guest = isGuestRequest(request);

  const limited = checkRateLimit(
    request,
    guest
      ? { limit: 10, namespace: "geocode-guest", windowMs: 60_000 }
      : { limit: 30, namespace: "geocode", windowMs: 60_000 },
  );
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

  // Held to the keyless provider by construction rather than by a branch at
  // the call site, so no future edit can reintroduce a paid call for guests.
  const googleKey = guest
    ? undefined
    : process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_MAPS_API_KEY;
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
        place_id?: string;
        partial_match?: boolean;
        types?: string[];
        address_components?: GoogleAddressComponent[];
        geometry?: {
          location?: { lat?: number; lng?: number };
          location_type?: string;
        };
      }>;
    };
    const first = json?.results?.[0];
    const loc = first?.geometry?.location;
    if (!first || typeof loc?.lat !== "number" || typeof loc?.lng !== "number") {
      return null;
    }
    const components = googleComponents(first.address_components);
    const addressWarnings = checkRequestedAddress(query, components);
    if (addressWarnings === null) return null;
    const addressQuery = looksLikeStreetAddress(query);
    const publishedTypes = first.types ?? [];
    const addressType = publishedTypes.some((type) =>
      ["street_address", "premise", "subpremise"].includes(type),
    );
    if (
      addressQuery &&
      (first.partial_match === true ||
        (publishedTypes.length > 0 && !addressType) ||
        (first.address_components && !components.houseNumber))
    ) {
      return null;
    }
    const precision = googlePrecision(first.geometry?.location_type, publishedTypes);
    const retrievedAt = new Date().toISOString();
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: first.formatted_address ?? query,
      match: {
        provider: "google",
        ...(first.place_id ? { providerId: first.place_id } : {}),
        matchType: publishedTypes[0] ?? "unknown",
        precision,
        partialMatch: first.partial_match === true,
        components,
        evidence: {
          status: "observed",
          source: {
            provider: "Google Maps",
            dataset: "Geocoding API",
            ...(first.place_id ? { recordId: first.place_id } : {}),
            sourceUrl: "https://developers.google.com/maps/documentation/geocoding",
          },
          retrievedAt,
          confidence: addressWarnings.length ? "low" : precision === "rooftop" ? "high" : precision === "unknown" ? "low" : "medium",
          warnings: [...addressWarnings, ...(precision === "unknown"
            ? ["The provider did not publish address-match precision."]
            : [])],
        },
      },
    };
  } catch (err) {
    console.error("[/api/geocode] Google geocode failed:", err);
    return null;
  }
}

async function geocodeWithNominatim(
  query: string,
): Promise<GeocodeResult | null> {
  // With the TypeSafe picker on, fetch several candidates and let it choose;
  // otherwise keep the provider's single best guess.
  const pickerEnabled = isGeocodePickerEnabled();
  try {
    const url = new URL(NOMINATIM_API);
    // Nominatim matches buildings, not units; the typed query is still what
    // the state rule and the picker judge against.
    url.searchParams.set("q", stripUnitDesignators(query));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", pickerEnabled ? String(PICKER_CANDIDATE_LIMIT) : "1");
    url.searchParams.set("countrycodes", "us");
    // Structured components, so the label shown to the visitor can be built
    // from real fields instead of parsed out of `display_name`.
    url.searchParams.set("addressdetails", "1");

    // Nominatim's usage policy requires an identifying User-Agent.
    const json = (await fetchJson(url.toString(), {
      headers: { "User-Agent": "LotFoundry/1.0 (ADU feasibility demo)" },
    })) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: NominatimAddress;
      osm_type?: string;
      osm_id?: number | string;
      type?: string;
      class?: string;
    }>;
    // Candidates with usable coordinates in the state the query names, in
    // provider rank order. The state rule is exact and free, so it filters
    // before any judgment is asked for.
    const hits = (Array.isArray(json) ? json : []).flatMap((hit) => {
      const lat = Number.parseFloat(hit?.lat ?? "");
      const lng = Number.parseFloat(hit?.lon ?? "");
      return !Number.isFinite(lat) || !Number.isFinite(lng) || !matchesRequestedState(query, hit.display_name) ||
        checkRequestedAddress(query, nominatimComponents(hit.address)) === null
        ? []
        : [{ ...hit, lat, lng }];
    });
    if (hits.length === 0) return null;

    let chosen = hits[0];
    if (pickerEnabled) {
      const pick = await pickGeocodeCandidate(
        query,
        hits.map((hit) => hit.display_name ?? query),
      );
      // A confident "none" means the provider matched something else, e.g.
      // the right street in the wrong city: no answer beats a wrong one.
      if (pick === "none") return null;
      if (typeof pick === "number" && hits[pick]) chosen = hits[pick];
    }

    if (
      looksLikeStreetAddress(query) &&
      chosen.address &&
      (!chosen.address.house_number || !chosen.address.road)
    ) {
      return null;
    }

    const components = nominatimComponents(chosen.address);
    const addressWarnings = checkRequestedAddress(query, components) ?? [];
    const providerId = chosen.osm_type && chosen.osm_id != null
      ? `${chosen.osm_type}/${chosen.osm_id}`
      : undefined;
    const precision = chosen.address?.house_number && chosen.address?.road
      ? "address"
      : chosen.address?.road
        ? "street"
        : hasNominatimLocality(chosen.address)
          ? "locality"
          : "unknown";
    const retrievedAt = new Date().toISOString();

    return {
      lat: chosen.lat,
      lng: chosen.lng,
      formattedAddress: formatNominatimAddress(
        chosen.address,
        chosen.display_name ?? query,
      ),
      match: {
        provider: "nominatim",
        ...(providerId ? { providerId } : {}),
        matchType: chosen.type ?? chosen.class ?? "unknown",
        precision,
        partialMatch: false,
        components,
        evidence: {
          status: "observed",
          source: {
            provider: "OpenStreetMap",
            dataset: "Nominatim",
            ...(providerId ? { recordId: providerId } : {}),
            sourceUrl: "https://nominatim.org/release-docs/latest/api/Search/",
          },
          retrievedAt,
          confidence: addressWarnings.length ? "low" : precision === "address" ? "medium" : "low",
          warnings: [...addressWarnings, ...(precision === "address"
            ? []
            : ["The result is not confirmed at a house-number address precision."])],
        },
      },
    };
  } catch (err) {
    console.error("[/api/geocode] Nominatim geocode failed:", err);
    return null;
  }
}

/** The subset of Nominatim's `addressdetails` response this route reads. */
interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface GoogleAddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

const STATE_CODES_BY_NAME = new Map(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

/** Street/ZIP conflicts are unsafe points. City aliases require a parcel check. */
function checkRequestedAddress(query: string, components: GeocodeMatch["components"]): string[] | null {
  const requested = parseStreetAddress(query);
  if (!requested) return [];
  const published = components.houseNumber && components.road
    ? parseStreetAddress(`${components.houseNumber} ${components.road}`)
    : null;
  if (published && requested.houseNumber !== published.houseNumber) return null;
  // Incomplete free text may not distinguish street from locality.
  if ((query.includes(",") || requested.city || requested.zip) && published && requested.street !== published.street) return null;
  if (requested.zip && components.zip && requested.zip !== components.zip.slice(0, 5)) return null;
  const state = requestedStateCode(query);
  if (state && components.state && state !== components.state) return null;
  if (requested.city && components.city && requested.city !== components.city.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim()) {
    return ["The geocoder's city differs from the requested city; the original address must be checked against county parcel records."];
  }
  return [];
}

function looksLikeStreetAddress(query: string): boolean {
  return /^\s*\d+[A-Za-z-]?\b/.test(stripUnitDesignators(query));
}

function googleComponents(
  components: GoogleAddressComponent[] | undefined,
): GeocodeMatch["components"] {
  const value = (type: string, short = false): string | undefined => {
    const component = components?.find((candidate) => candidate.types?.includes(type));
    return short ? component?.short_name : component?.long_name;
  };

  return {
    ...(value("street_number") ? { houseNumber: value("street_number") } : {}),
    ...(value("route") ? { road: value("route") } : {}),
    ...(value("locality") ?? value("postal_town") ?? value("sublocality")
      ? { city: value("locality") ?? value("postal_town") ?? value("sublocality") }
      : {}),
    ...(value("administrative_area_level_1", true)
      ? { state: value("administrative_area_level_1", true) }
      : {}),
    ...(value("postal_code") ? { zip: value("postal_code") } : {}),
    ...(value("country", true) ? { country: value("country", true) } : {}),
  };
}

function googlePrecision(
  locationType: string | undefined,
  types: string[],
): GeocodeMatch["precision"] {
  if (locationType === "ROOFTOP") return "rooftop";
  if (locationType === "RANGE_INTERPOLATED") return "range-interpolated";
  if (types.some((type) => ["street_address", "premise", "subpremise"].includes(type))) {
    return "address";
  }
  if (types.includes("route")) return "street";
  if (
    types.some((type) =>
      ["locality", "postal_town", "administrative_area_level_2"].includes(type),
    )
  ) {
    return "locality";
  }
  return "unknown";
}

function nominatimComponents(
  address: NominatimAddress | undefined,
): GeocodeMatch["components"] {
  if (!address) return {};

  const city =
    address.city ?? address.town ?? address.village ?? address.hamlet ?? address.suburb;
  const state = address.state
    ? (STATE_CODES_BY_NAME.get(address.state.toLowerCase()) ?? address.state)
    : undefined;

  return {
    ...(address.house_number ? { houseNumber: address.house_number } : {}),
    ...(address.road ? { road: address.road } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(address.postcode ? { zip: address.postcode } : {}),
    ...(address.country_code
      ? { country: address.country_code.toUpperCase() }
      : address.country
        ? { country: address.country }
        : {}),
  };
}

function hasNominatimLocality(address: NominatimAddress | undefined): boolean {
  return Boolean(
    address?.city ??
      address?.town ??
      address?.village ??
      address?.hamlet ??
      address?.suburb,
  );
}

/**
 * Build a conventional US address label from Nominatim's structured fields.
 *
 * `display_name` is a nine-segment OSM path — "1421, Northeast 88th Street,
 * Maple Leaf, Seattle, King County, Washington, 98115, United States" — and it
 * is shown to the visitor as *their address* on the screen carrying the rent
 * and payback figures. A label that reads like database output there undercuts
 * numbers the visitor is being asked to trust.
 *
 * Falls back to the raw label whenever the structured fields are too sparse to
 * beat it, so a thin result degrades to today's behaviour rather than to a
 * fragment.
 */
function formatNominatimAddress(
  address: NominatimAddress | undefined,
  fallback: string,
): string {
  if (!address) return fallback;

  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  const city =
    address.city ?? address.town ?? address.village ?? address.hamlet ?? address.suburb ?? "";
  const state = address.state
    ? (STATE_CODES_BY_NAME.get(address.state.toLowerCase()) ?? address.state)
    : "";
  const stateZip = [state, address.postcode].filter(Boolean).join(" ");

  const parts = [street, city, stateZip].filter(Boolean);
  // A street plus at least one locality component; anything less is no clearer
  // than the raw label and loses information.
  return street && parts.length >= 2 ? parts.join(", ") : fallback;
}

/** Spelled-out state names, longest first so "West Virginia" wins over "Virginia". */
const STATE_NAMES_LONGEST_FIRST = Array.from(STATE_CODES_BY_NAME).sort(
  ([a], [b]) => b.length - a.length,
);

/**
 * The state a free-text query names, read only from its end — where a US
 * address carries it — or null when the end names none.
 *
 * Anywhere earlier, two-letter words collide with state codes: the "NE" in
 * "1421 NE 88th St, Seattle" is a directional, "Fl 2" is a floor, "in" is a
 * preposition. Scanning the whole query read those as Nebraska, Florida and
 * Indiana whenever no state followed, and threw the correct result away.
 */
function requestedStateCode(query: string): string | null {
  const components = query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  // A trailing country or bare ZIP sits after the state; drop both.
  while (
    components.length > 0 &&
    /^(?:usa?|united states(?: of america)?|\d{5}(?:-\d{4})?)$/i.test(components.at(-1) ?? "")
  ) {
    components.pop();
  }
  const last = (components.at(-1) ?? "").replace(/\s*\d{5}(?:-\d{4})?$/, "").trim();
  if (!last) return null;

  const lower = last.toLowerCase();
  for (const [name, code] of STATE_NAMES_LONGEST_FIRST) {
    if (lower === name || lower.endsWith(` ${name}`)) return code;
  }
  const tail = (last.split(/\s+/).at(-1) ?? "").toUpperCase();
  return US_STATE_NAMES[tail] ? tail : null;
}

/**
 * Whether a Nominatim hit is in the state the query asked for, used to reject
 * a same-named street in the wrong state. A query that ends without naming a
 * state (see {@link requestedStateCode}) accepts any state.
 */
function matchesRequestedState(query: string, displayName?: string): boolean {
  const stateCode = requestedStateCode(query);
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
