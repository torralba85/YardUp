import { type NextRequest, NextResponse } from "next/server";
import type { LiveParcelData } from "@/lib/parcel-types";
import { parcelPresets } from "@/lib/feasibility";
import { extractZip, parseParcelCityState } from "@/lib/marketplace";
import { estimateLotDimensions, orientedLotDimensions } from "@/lib/parcel-geometry";
import {
  type CensusLocation,
  fetchCensusLocation,
} from "@/lib/server/census-geocode";
import { fetchBuildingFootprint } from "@/lib/server/building-footprints";
import { fetchCountyParcel } from "@/lib/server/county-parcels";
import { resolveMarketData } from "@/lib/server/market/resolve-market";
import {
  extractRegridLocation,
  inferStateFromCountySource,
  stripStatewideLabel,
} from "@/lib/server/parcel-location";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const REGRID_API = "https://app.regrid.com/api/v2/parcels/point";
const TIMEOUT_MS = 5000;

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Rough R-1 fallback setbacks used when Regrid has no zoning data. */
const DEFAULT_SETBACKS = { front: 20, rear: 20, side: 5 };

/**
 * GET /api/parcel?lat={lat}&lng={lng}
 *
 * Resolves parcel data through the configured provider preference: paid
 * Regrid record → free public county/statewide GIS parcel → the nearest
 * preset's typical dimensions. Returns a LiveParcelData object.
 *
 * The free US Census geocoder resolves state/ZIP/county alongside the chain
 * for every path, so financials key off the address's own geography even when
 * no parcel provider answers. Responses are cached for an hour.
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

  // Kicked off before the parcel providers so the two run concurrently: the
  // geocoder is free and keyless, so the only cost of always asking is one
  // parallel request that never extends the critical path.
  const censusLocation = fetchCensusLocation({
    lat,
    lng,
    address: requestedAddress,
  });

  const regridKey = process.env.REGRID_API_KEY;
  if (!regridKey) {
    // Keyless demo: no Regrid configured. Free county/statewide GIS still
    // gives real geometry for a covered address before presets are used.
    return await successWithoutRegrid(
      lat,
      lng,
      requestedAddress,
      censusLocation,
    );
  }

  try {
    const url = new URL(REGRID_API);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("token", regridKey);
    url.searchParams.set("limit", "1");

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
    const parcels = json?.parcels?.features ?? json?.results?.features ?? [];
    if (parcels.length === 0) {
      return await successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
      );
    }

    const feature = parcels[0];
    const fields = feature?.properties?.fields ?? {};
    const geometry = feature?.geometry ?? null;
    const boundaryGeoJson =
      geometry?.type === "Polygon" ? geometry : null;

    const lotAreaSqft = fields.ll_gisacre
      ? Math.round(fields.ll_gisacre * 43560)
      : 5000;

    const regridFootprint = positiveNumber(fields.ll_bldg_footprint_sqft);
    const structuresPromise =
      regridFootprint === null && boundaryGeoJson
        ? fetchBuildingFootprint(boundaryGeoJson)
        : Promise.resolve(null);

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

    // Financial figures must resolve to the address's own market. Regrid's
    // own location fields win when populated — they are parcel-level — with
    // the Census geocoder filling the gaps its standard schema leaves.
    const [census, structures] = await Promise.all([
      censusLocation,
      structuresPromise,
    ]);
    const loc = mergeLocations(extractRegridLocation(fields), census);
    const marketData = await resolveMarketData({ lat, lng, ...loc });
    const existingHouseSqft =
      regridFootprint ??
      positiveNumber(structures?.totalSqft) ??
      positiveNumber(fields.sqft) ??
      0;

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
      boundaryGeoJson,
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
    return await successWithoutRegrid(
      lat,
      lng,
      requestedAddress,
      censusLocation,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Everything below Regrid in the chain: try the free public county/statewide
 * GIS services for real geometry, then settle for the nearest preset. Shared
 * by the no-key, no-match, and fetch-failure paths so all three degrade the
 * same way.
 */
async function successWithoutRegrid(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  censusLocation: Promise<CensusLocation | null>,
): Promise<NextResponse> {
  const [countyParcel, census] = await Promise.all([
    fetchCountyParcel(lat, lng),
    censusLocation,
  ]);

  // A GIS hit without a usable area cannot describe a lot, so it falls
  // through to the preset rather than yielding a zero-area parcel.
  if (countyParcel && (countyParcel.lotAreaSqft ?? 0) > 0) {
    return await countyGisResponse(
      lat,
      lng,
      requestedAddress,
      countyParcel,
      census,
    );
  }
  return await presetFallbackResponse(lat, lng, requestedAddress, census);
}

/** Build a LiveParcelData from a free county/statewide GIS parcel polygon. */
async function countyGisResponse(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  countyParcel: NonNullable<Awaited<ReturnType<typeof fetchCountyParcel>>>,
  census: CensusLocation | null,
): Promise<NextResponse> {
  const lotArea = countyParcel.lotAreaSqft as number;
  const { lotWidth, lotLength } =
    orientedLotDimensions(countyParcel.polygon, lotArea) ??
    estimateLotDimensions(lotArea);

  // This is a real parcel at real coordinates, so it must never borrow the
  // nearest demo preset's street address: labelling a Fresno lot "1421 NW
  // Oak Street, Seattle" reads as a wrong answer rather than a fallback.
  const location = formatResolvedLocation(requestedAddress, census, lat, lng);

  // The Census geocoder is the authority here, not the parcel layer: GIS
  // publishers spell their own county inconsistently ("NewYork", "DANE"),
  // and a spelling the market index cannot key on silently downgrades the
  // financials to national averages. The layer's name is only a backstop —
  // and a statewide layer's label ("Ohio (statewide)") names no county at
  // all, so it is dropped rather than passed to the market index. The layer
  // identity still carries a usable state when Census is unavailable.
  const loc = {
    state: census?.state || inferStateFromCountySource(countyParcel.county),
    zip: census?.zip ?? "",
    county: census?.county || stripStatewideLabel(countyParcel.county),
  };
  const [marketData, structures] = await Promise.all([
    resolveMarketData({ lat, lng, ...loc }),
    fetchBuildingFootprint(countyParcel.polygon),
  ]);

  const parcel: LiveParcelData = {
    address: location.address,
    city: location.city,
    lotArea,
    lotWidth,
    lotLength,
    // County parcel layers describe land rather than structures. The free
    // USA Structures layer fills this only when it finds a positive footprint
    // whose published centroid lies inside the parcel; zero remains unknown.
    existingHouseSqft: positiveNumber(structures?.totalSqft) ?? 0,
    maxLotCoveragePercent: deriveMaxCoverage(undefined),
    setbacks: DEFAULT_SETBACKS,
    zoning: "Unknown",
    boundaryGeoJson: countyParcel.polygon,
    lat,
    lng,
    source: "county-gis",
    state: loc.state,
    zip: loc.zip,
    county: loc.county,
    marketData,
  };
  return NextResponse.json(parcel, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}

async function presetFallbackResponse(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  census: CensusLocation | null,
): Promise<NextResponse> {
  const preset = nearestPreset(lat, lng);
  // The preset only lends typical *dimensions*, never its identity: a
  // coordinate-only lookup reports its own coordinates and whatever geography
  // the Census geocoder resolved, not the preset's street address.
  const location = formatResolvedLocation(requestedAddress, census, lat, lng);
  // Financial market data must still resolve from the searched address's own
  // geography — a California address must never inherit Seattle/Portland/
  // Austin economics just because the parcel lookup fell back. The Census
  // geocoder resolves that geography directly; parsing the address string is
  // the last resort.
  const area = requestedAddress ? parseParcelCityState(location.city) : null;
  const parsedZip = requestedAddress ? extractZip(requestedAddress) : "";
  const loc = mergeLocations(
    { state: area?.state ?? "", zip: parsedZip },
    census,
  );
  const marketData = await resolveMarketData({ lat, lng, ...loc });
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
    state: loc.state,
    zip: loc.zip,
    county: loc.county,
    marketData,
  };
  return NextResponse.json(fallback, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

/**
 * Overlay a Census geocoder result onto a provider's own location fields,
 * per field: the provider wins wherever it actually has a value, and the
 * geocoder fills the rest. Neither source is complete on its own — Regrid's
 * standard schema often omits all three, and the Census coordinate endpoint
 * never returns a ZIP.
 */
function mergeLocations(
  primary: { state: string; zip: string; county?: string },
  census: CensusLocation | null,
): { state: string; zip: string; county?: string } {
  return {
    state: primary.state || census?.state || "",
    zip: primary.zip || census?.zip || "",
    county: primary.county || census?.county,
  };
}

function positiveNumber(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

function sanitizeAddress(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 240);
}

/**
 * Best available `"City, ST ZIP"` label from the Census geocoder alone, for
 * the paths that have no address string to split. The coordinate endpoint
 * returns no place name, so the county stands in for the city.
 */
function censusCityLabel(census: CensusLocation | null): string {
  const county = census?.county ? `${census.county} County` : "";
  const stateZip = [census?.state ?? "", census?.zip ?? ""]
    .filter(Boolean)
    .join(" ");
  return [county, stateZip].filter(Boolean).join(", ");
}

/**
 * Label a parcel from what was actually resolved — the searched address, else
 * the coordinates themselves — never from a demo preset.
 *
 * A preset lends typical lot *dimensions* to a fallback response. Lending its
 * address too would report a Fresno lookup as a Seattle street address, which
 * a caller cannot tell apart from a real answer.
 */
function formatResolvedLocation(
  requestedAddress: string | undefined,
  census: CensusLocation | null,
  lat: number,
  lng: number,
): { address: string; city: string } {
  if (!requestedAddress) {
    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      city: censusCityLabel(census),
    };
  }

  const [street, ...rest] = requestedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!street) {
    return { address: requestedAddress, city: censusCityLabel(census) };
  }

  return {
    address: street,
    city: rest.join(", ") || censusCityLabel(census),
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
