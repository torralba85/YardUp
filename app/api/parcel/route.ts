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
import { extractRegridLocation } from "@/lib/server/parcel-location";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const REGRID_API = "https://app.regrid.com/api/v2/parcels/point";
const TIMEOUT_MS = 5000;
export const runtime = "nodejs";
const DEFAULT_SETBACKS = { front: 20, rear: 20, side: 5 };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limited = checkRateLimit(request, { limit: 60, namespace: "parcel", windowMs: 60_000 });
  if (limited) return limited;

  const coordinates = parseCoordinateParams(searchParams);
  if (coordinates instanceof NextResponse) return coordinates;
  const { lat, lng } = coordinates;
  const requestedAddress = sanitizeAddress(searchParams.get("address"));
  const censusLocation = fetchCensusLocation({ lat, lng, address: requestedAddress });

  const regridKey = process.env.REGRID_API_KEY;
  if (!regridKey) {
    return await successWithoutRegrid(lat, lng, requestedAddress, censusLocation);
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
        { status: 503, headers: { "Retry-After": "10" } },
      );
    }
    if (!regridRes.ok) throw new Error(`Regrid returned ${regridRes.status}`);

    const json = await regridRes.json();
    const parcels = json?.parcels?.features ?? json?.results?.features ?? [];
    if (parcels.length === 0) {
      return await successWithoutRegrid(lat, lng, requestedAddress, censusLocation);
    }

    const feature = parcels[0];
    const fields = feature?.properties?.fields ?? {};
    const geometry = feature?.geometry ?? null;
    const boundaryGeoJson = geometry?.type === "Polygon" ? geometry : null;
    const lotAreaSqft = fields.ll_gisacre ? Math.round(fields.ll_gisacre * 43560) : 5000;
    const regridFootprint = positiveNumber(fields.ll_bldg_footprint_sqft);
    const structuresPromise =
      regridFootprint === null && boundaryGeoJson
        ? fetchBuildingFootprint(boundaryGeoJson)
        : Promise.resolve(null);
    const { lotWidth, lotLength } =
      orientedLotDimensions(boundaryGeoJson, lotAreaSqft) ?? estimateLotDimensions(lotAreaSqft);
    const setbacks = parseSetbacks(fields.zoning_setbacks);
    const [census, structures] = await Promise.all([censusLocation, structuresPromise]);
    const loc = mergeLocations(extractRegridLocation(fields), census);
    const marketData = await resolveMarketData({ lat, lng, ...loc });
    const existingHouseSqft =
      regridFootprint ?? positiveNumber(structures?.totalSqft) ?? positiveNumber(fields.sqft) ?? 0;

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
    return await successWithoutRegrid(lat, lng, requestedAddress, censusLocation);
  }
}

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

  if (countyParcel && (countyParcel.lotAreaSqft ?? 0) > 0) {
    return await countyGisResponse(lat, lng, requestedAddress, countyParcel, census);
  }
  return await presetFallbackResponse(lat, lng, requestedAddress, census);
}

async function countyGisResponse(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  countyParcel: NonNullable<Awaited<ReturnType<typeof fetchCountyParcel>>>,
  census: CensusLocation | null,
): Promise<NextResponse> {
  const lotArea = countyParcel.lotAreaSqft as number;
  const { lotWidth, lotLength } =
    orientedLotDimensions(countyParcel.polygon, lotArea) ?? estimateLotDimensions(lotArea);
  const location = formatResolvedLocation(requestedAddress, census, lat, lng);
  const gisState = inferStateFromCountySource(countyParcel.county);
  const loc = {
    state: census?.state || gisState,
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
  const location = requestedAddress
    ? formatResolvedLocation(requestedAddress, census, lat, lng)
    : { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: censusCityLabel(census) };
  const area = requestedAddress ? parseParcelCityState(location.city) : null;
  const parsedZip = requestedAddress ? extractZip(requestedAddress) : "";
  const loc = mergeLocations({ state: area?.state ?? "", zip: parsedZip }, census);
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

function inferStateFromCountySource(county: string): string {
  const match = county.match(/^(California|Washington|New York|Ohio|Wisconsin|Florida|Vermont|Nevada) \(statewide\)$/);
  if (!match) return "";
  const map: Record<string, string> = {
    California: "CA",
    Washington: "WA",
    "New York": "NY",
    Ohio: "OH",
    Wisconsin: "WI",
    Florida: "FL",
    Vermont: "VT",
    Nevada: "NV",
  };
  return map[match[1]] ?? "";
}

function stripStatewideLabel(county: string): string {
  return county.endsWith(" (statewide)") ? "" : county;
}

function censusCityLabel(census: CensusLocation | null): string {
  return [census?.county ? `${census.county} County` : "", census?.state ?? "", census?.zip ?? ""]
    .filter(Boolean)
    .join(", ");
}

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
  return {
    address: street || requestedAddress,
    city: rest.join(", ") || censusCityLabel(census),
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

function nearestPreset(lat: number, lng: number) {
  const centers: { id: string; lat: number; lng: number }[] = [
    { id: "oak-street", lat: 47.68, lng: -122.29 },
    { id: "corner-lot", lat: 45.54, lng: -122.63 },
    { id: "compact-lot", lat: 30.25, lng: -97.75 },
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
  fields: Record<string, unknown>,
  requestedAddress: string | undefined,
  lat: number,
  lng: number,
): string {
  const provider = String(fields.address ?? fields.saddr ?? "").trim();
  if (provider) return provider;
  if (requestedAddress) return requestedAddress.split(",")[0]?.trim() || requestedAddress;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatCity(fields: Record<string, unknown>): string {
  const city = String(fields.city ?? fields.scity ?? "").trim();
  const state = String(fields.state2 ?? fields.state ?? "").trim();
  const zip = String(fields.szip5 ?? fields.zip ?? "").trim();
  return [city, state, zip].filter(Boolean).join(", ").replace(", ,", ",");
}

function cityFromRequestedAddress(requestedAddress?: string): string {
  if (!requestedAddress) return "";
  return requestedAddress.split(",").slice(1).map((part) => part.trim()).filter(Boolean).join(", ");
}
