/**
 * Deep module orchestrating parcel resolution across providers.
 *
 * Implements the Provider Chain: Paid Regrid API → Public County GIS →
 * Regional Demo Preset, with Census geography and USA Structures building
 * footprints resolved in parallel.
 *
 * All provider adapters are configurable via constructor dependencies,
 * allowing unit tests to run in-process with typed stubs without mocking
 * global HTTP fetch or NextRequest instances.
 */

import type { GeoJsonPolygon, LiveParcelData } from "@/lib/parcel-types";
import { parcelPresets } from "@/lib/feasibility";
import { extractZip, parseParcelCityState } from "@/lib/marketplace";
import {
  estimateLotDimensions,
  orientedLotDimensions,
} from "@/lib/parcel-geometry";
import {
  type CensusLocation,
  fetchCensusLocation as defaultFetchCensusLocation,
} from "@/lib/server/census-geocode";
import {
  fetchBuildingFootprint as defaultFetchBuildingFootprint,
} from "@/lib/server/building-footprints";
import {
  fetchCountyParcel as defaultFetchCountyParcel,
} from "@/lib/server/county-parcels";
import {
  resolveMarketData as defaultResolveMarketData,
} from "@/lib/server/market/resolve-market";
import { extractRegridLocation } from "@/lib/server/parcel-location";

const REGRID_API = "https://app.regrid.com/api/v2/parcels/point";
const DEFAULT_TIMEOUT_MS = 5000;

/** Rough R-1 fallback setbacks used when Regrid has no zoning data. */
const DEFAULT_SETBACKS = { front: 20, rear: 20, side: 5 };

export interface ParcelQuery {
  lat: number;
  lng: number;
  address?: string;
}

export interface RegridFetchResult {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

async function defaultFetchRegrid(
  lat: number,
  lng: number,
  token: string,
  signal: AbortSignal,
): Promise<RegridFetchResult> {
  const url = new URL(REGRID_API);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("token", token);
  url.searchParams.set("limit", "1");
  return fetch(url.toString(), { signal });
}

export interface ParcelResolverDependencies {
  fetchRegrid?: (
    lat: number,
    lng: number,
    token: string,
    signal: AbortSignal,
  ) => Promise<RegridFetchResult>;
  fetchCountyParcel?: typeof defaultFetchCountyParcel;
  fetchCensusLocation?: typeof defaultFetchCensusLocation;
  fetchBuildingFootprint?: typeof defaultFetchBuildingFootprint;
  resolveMarketData?: typeof defaultResolveMarketData;
  regridApiKey?: string;
  timeoutMs?: number;
}

interface RegridFeature {
  geometry?: GeoJsonPolygon | null;
  properties?: {
    fields?: Record<string, string | number | undefined>;
  };
}

interface RegridPayload {
  parcels?: { features?: RegridFeature[] };
  results?: { features?: RegridFeature[] };
}

export class ParcelResolver {
  private readonly fetchRegrid: (
    lat: number,
    lng: number,
    token: string,
    signal: AbortSignal,
  ) => Promise<RegridFetchResult>;
  private readonly fetchCountyParcel: typeof defaultFetchCountyParcel;
  private readonly fetchCensusLocation: typeof defaultFetchCensusLocation;
  private readonly fetchBuildingFootprint: typeof defaultFetchBuildingFootprint;
  private readonly resolveMarketData: typeof defaultResolveMarketData;
  private readonly regridApiKey?: string;
  private readonly timeoutMs: number;

  constructor(deps: ParcelResolverDependencies = {}) {
    this.fetchRegrid = deps.fetchRegrid ?? defaultFetchRegrid;
    this.fetchCountyParcel = deps.fetchCountyParcel ?? defaultFetchCountyParcel;
    this.fetchCensusLocation = deps.fetchCensusLocation ?? defaultFetchCensusLocation;
    this.fetchBuildingFootprint = deps.fetchBuildingFootprint ?? defaultFetchBuildingFootprint;
    this.resolveMarketData = deps.resolveMarketData ?? defaultResolveMarketData;
    this.regridApiKey = deps.regridApiKey ?? process.env.REGRID_API_KEY;
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Resolve parcel data from geographic coordinates and optional street address.
   *
   * Executes the provider chain:
   * 1. Paid Regrid parcel record (if API key is available).
   * 2. Free public county/statewide GIS boundary with USA Structures footprint.
   * 3. Nearest regional demo preset with Census-derived economics.
   */
  async resolve(query: ParcelQuery): Promise<LiveParcelData> {
    const { lat, lng } = query;
    const requestedAddress = sanitizeAddress(query.address);

    // Kicked off concurrently: Census geocoder is free and keyless, so the only
    // cost of always asking is one parallel request that never extends the critical path.
    const censusLocation = this.fetchCensusLocation({
      lat,
      lng,
      address: requestedAddress,
    });

    const regridKey = this.regridApiKey ?? process.env.REGRID_API_KEY;
    if (!regridKey) {
      return await this.successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
      );
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let regridRes: RegridFetchResult;
      try {
        regridRes = await this.fetchRegrid(
          lat,
          lng,
          regridKey,
          controller.signal,
        );
      } finally {
        clearTimeout(timer);
      }

      // Per ADR-0001: Gracefully degrade down the chain on rate-limiting (429)
      // rather than failing the entire feasibility study with HTTP 503.
      if (regridRes.status === 429) {
        console.warn("[ParcelResolver] Regrid rate limited (429); degrading to county GIS");
        return await this.successWithoutRegrid(
          lat,
          lng,
          requestedAddress,
          censusLocation,
        );
      }

      if (!regridRes.ok) {
        throw new Error(`Regrid returned ${regridRes.status}`);
      }

      const json = (await regridRes.json()) as RegridPayload | null;
      const parcels = json?.parcels?.features ?? json?.results?.features ?? [];
      if (parcels.length === 0) {
        return await this.successWithoutRegrid(
          lat,
          lng,
          requestedAddress,
          censusLocation,
        );
      }

      const feature = parcels[0];
      const fields = feature?.properties?.fields ?? {};
      const geometry = feature?.geometry ?? null;
      const boundaryGeoJson = geometry?.type === "Polygon" ? geometry : null;

      const lotAreaSqft = fields.ll_gisacre
        ? Math.round(fields.ll_gisacre * 43560)
        : 5000;

      const regridFootprint = positiveNumber(fields.ll_bldg_footprint_sqft);
      const structuresPromise =
        regridFootprint === null && boundaryGeoJson
          ? this.fetchBuildingFootprint(boundaryGeoJson)
          : Promise.resolve(null);

      // Prefer the real parcel shape's oriented bounding box; otherwise estimate
      // proportions from lot area so 3D lot responds to address.
      const { lotWidth, lotLength } =
        orientedLotDimensions(boundaryGeoJson, lotAreaSqft) ??
        estimateLotDimensions(lotAreaSqft);

      const setbacks = parseSetbacks(fields.zoning_setbacks);

      const [census, structures] = await Promise.all([
        censusLocation,
        structuresPromise,
      ]);
      const loc = mergeLocations(extractRegridLocation(fields), census);
      const marketData = await this.resolveMarketData({ lat, lng, ...loc });
      const existingHouseSqft =
        regridFootprint ??
        positiveNumber(structures?.totalSqft) ??
        positiveNumber(fields.sqft) ??
        0;

      return {
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
    } catch (err) {
      console.error("[ParcelResolver] Regrid lookup failed:", err);
      return await this.successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
      );
    }
  }

  /**
   * Fallback chain below Regrid: try free county/statewide GIS services for
   * real geometry, then settle for the nearest preset.
   */
  private async successWithoutRegrid(
    lat: number,
    lng: number,
    requestedAddress: string | undefined,
    censusLocation: Promise<CensusLocation | null>,
  ): Promise<LiveParcelData> {
    const [countyParcel, census] = await Promise.all([
      this.fetchCountyParcel(lat, lng),
      censusLocation,
    ]);

    if (countyParcel && (countyParcel.lotAreaSqft ?? 0) > 0) {
      return await this.countyGisResponse(
        lat,
        lng,
        requestedAddress,
        countyParcel,
        census,
      );
    }
    return await this.presetFallbackResponse(lat, lng, requestedAddress, census);
  }

  /** Build a LiveParcelData from a free county/statewide GIS parcel polygon. */
  private async countyGisResponse(
    lat: number,
    lng: number,
    requestedAddress: string | undefined,
    countyParcel: NonNullable<Awaited<ReturnType<typeof defaultFetchCountyParcel>>>,
    census: CensusLocation | null,
  ): Promise<LiveParcelData> {
    const preset = nearestPreset(lat, lng);
    const location = formatFallbackLocation(requestedAddress, preset);
    const lotArea = countyParcel.lotAreaSqft as number;
    const { lotWidth, lotLength } =
      orientedLotDimensions(countyParcel.polygon, lotArea) ??
      estimateLotDimensions(lotArea);

    const loc = {
      state: census?.state ?? "",
      zip: census?.zip ?? "",
      county: census?.county || countyParcel.county,
    };
    const [marketData, structures] = await Promise.all([
      this.resolveMarketData({ lat, lng, ...loc }),
      this.fetchBuildingFootprint(countyParcel.polygon),
    ]);

    return {
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
  }

  /** Build a LiveParcelData from a regional demo preset with localized economics. */
  private async presetFallbackResponse(
    lat: number,
    lng: number,
    requestedAddress: string | undefined,
    census: CensusLocation | null,
  ): Promise<LiveParcelData> {
    const preset = nearestPreset(lat, lng);
    const location = formatFallbackLocation(requestedAddress, preset);
    const area = requestedAddress ? parseParcelCityState(location.city) : null;
    const parsedZip = requestedAddress ? extractZip(requestedAddress) : "";
    const loc = mergeLocations(
      { state: area?.state ?? "", zip: parsedZip },
      census,
    );
    const marketData = await this.resolveMarketData({ lat, lng, ...loc });

    return {
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
  }
}

export const defaultParcelResolver = new ParcelResolver();

// ---------------------------------------------------------------------------
// Domain Helpers
// ---------------------------------------------------------------------------

export function sanitizeAddress(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 240);
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

function positiveNumber(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
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
  fields: Record<string, string | number | undefined>,
  requestedAddress: string | undefined,
  lat: number,
  lng: number,
): string {
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
