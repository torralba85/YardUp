import { type NextRequest, NextResponse } from "next/server";
import type { LiveParcelData } from "@/lib/parcel-types";
import type {
  DataEvidence,
  EvidenceStatus,
  EvidenceSource,
  ProviderAttempt,
} from "@/lib/data-evidence";
import { parcelPresets } from "@/lib/feasibility";
import { extractZip, parseParcelCityState } from "@/lib/marketplace";
import {
  estimateLotDimensions,
  orientedLotDimensions,
  polygonContainsPoint,
} from "@/lib/parcel-geometry";
import {
  type CensusLocation,
  fetchCensusLocation,
} from "@/lib/server/census-geocode";
import { fetchBuildingFootprint } from "@/lib/server/building-footprints";
import {
  type CountyParcelResult,
  fetchCountyParcelWithDiagnostics,
} from "@/lib/server/county-parcels";
import { resolveMarketData } from "@/lib/server/market/resolve-market";
import {
  extractRegridLocation,
  inferStateFromCountySource,
  stripStatewideLabel,
} from "@/lib/server/parcel-location";
import { isGuestRequest } from "@/lib/server/guest-request";
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
 * preset's typical dimensions. Returns a LiveParcelData object. Requests
 * without a bearer token start at the free county/statewide GIS step, so an
 * anonymous lookup costs nothing but still returns real parcel geometry.
 *
 * The free US Census geocoder resolves state/ZIP/county alongside the chain
 * for every path, so financials key off the address's own geography even when
 * no parcel provider answers. Responses are cached for an hour.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Anonymous visitors get the free provider chain and a tighter window. The
  // landing funnel lets a guest look up one real address before signing in,
  // and that lookup must not be able to spend metered Regrid quota.
  const guest = isGuestRequest(request);

  const limited = checkRateLimit(
    request,
    guest
      ? { limit: 10, namespace: "parcel-guest", windowMs: 60_000 }
      : { limit: 60, namespace: "parcel", windowMs: 60_000 },
  );
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

  // Guests are held to the keyless chain by construction rather than by a
  // branch further down, so no future edit can reintroduce a paid call on the
  // anonymous path.
  const regridKey = guest ? undefined : process.env.REGRID_API_KEY;
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

    // Rate limiting is a provider failure, not a request failure. Halting
    // here used to fail the whole lookup whenever Regrid's quota spiked, even
    // though the keyless county/statewide GIS chain below can still answer.
    if (regridRes.status === 429) {
      console.warn("[/api/parcel] Regrid rate-limited; degrading to public GIS");
      return await successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
        [regridAttempt("provider-error", "Regrid rate-limited the lookup.")],
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
        [regridAttempt("no-match", "Regrid returned no parcel at this point.")],
      );
    }

    const feature = parcels[0];
    const fields = feature?.properties?.fields ?? {};
    const geometry = feature?.geometry ?? null;
    const boundaryGeoJson =
      geometry?.type === "Polygon" ? geometry : null;

    if (boundaryGeoJson && !polygonContainsPoint(boundaryGeoJson, lng, lat)) {
      return await successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
        [regridAttempt(
          "invalid-response",
          "Regrid returned a parcel polygon that does not contain the requested point.",
        )],
      );
    }

    const gisAcres = positiveNumber(fields.ll_gisacre);
    // A Regrid record without an observed parcel area is not usable for the
    // feasibility engine. Continue to the public geometry chain rather than
    // turning missing data into a precise-looking 5,000 sq ft parcel.
    if (gisAcres === null) {
      return await successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
        [regridAttempt(
          "invalid-response",
          "Regrid returned a parcel without a usable lot area.",
        )],
      );
    }
    const lotAreaSqft = Math.round(gisAcres * 43560);

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
    const structuresFootprint = positiveNumber(structures?.totalSqft);
    const buildingAreaFallback = positiveNumber(fields.sqft);
    const existingHouseSqft =
      regridFootprint ?? structuresFootprint ?? buildingAreaFallback ?? 0;
    const retrievedAt = new Date().toISOString();
    const regridSource: EvidenceSource = {
      provider: "Regrid",
      dataset: "Parcel API v2",
      recordId: stringValue(fields.ll_uuid),
      sourceUrl: "https://support.regrid.com/docs/source-lineage",
    };
    const sourceAsOf = stringValue(fields.ll_last_refresh);
    const sourceUpdatedAt = stringValue(fields.ll_updated_at);
    const evidence = (
      status: EvidenceStatus,
      confidence: DataEvidence["confidence"],
      warnings: string[] = [],
      source = regridSource,
    ): DataEvidence => ({
      status,
      source,
      ...(sourceAsOf ? { sourceAsOf } : {}),
      ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}),
      retrievedAt,
      confidence,
      warnings,
    });
    const rawSetbacks = fields.zoning_setbacks as
      | Record<string, number>
      | null
      | undefined;
    const setbacksObserved = hasCompleteSetbacks(rawSetbacks);
    const zoningObserved = typeof fields.zoning === "string" && fields.zoning.trim() !== "";
    const addressObserved = Boolean(fields.saddress ?? fields.address);
    const footprintEvidence = regridFootprint !== null
      ? evidence("observed", "high")
      : structuresFootprint !== null
        ? evidence("observed", "medium", [
            "Imagery-derived building footprints can lag recent construction.",
          ], usaStructuresSource())
        : buildingAreaFallback !== null
          ? evidence("derived", "low", [
              "Provider building area is being used as a ground-footprint proxy.",
            ])
          : evidence("unavailable", "unknown", [
              "No existing-building footprint was found; zero means unknown, not vacant.",
            ]);

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
      dataQuality: {
        version: 1,
        fields: {
          address: addressObserved
            ? evidence("observed", "high")
            : evidence("derived", "medium", [
                "The provider did not publish a situs address; the searched address or coordinates were used.",
              ], userInputSource()),
          lotArea: evidence("observed", "high"),
          lotDimensions: evidence("derived", boundaryGeoJson ? "medium" : "low", [
            boundaryGeoJson
              ? "Lot dimensions are derived from the parcel polygon."
              : "Lot dimensions are estimated from parcel area because no polygon was available.",
          ]),
          existingHouseSqft: footprintEvidence,
          maxLotCoveragePercent: zoningObserved
            ? evidence("derived", "low", [
                "Maximum lot coverage is inferred from a broad zoning-code heuristic, not a jurisdiction rule.",
              ])
            : evidence("defaulted", "low", [
                "Maximum lot coverage is a planning assumption because zoning rules were unavailable.",
              ]),
          setbacks: setbacksObserved
            ? evidence("observed", "medium")
            : evidence("defaulted", "low", [
                "Setbacks are planning assumptions because address-specific rules were unavailable.",
              ]),
          zoning: zoningObserved
            ? evidence("observed", "medium")
            : evidence("unavailable", "unknown", [
                "Address-specific zoning was unavailable.",
              ]),
          boundaryGeoJson: boundaryGeoJson
            ? evidence("observed", "high")
            : evidence("unavailable", "unknown", [
                "The provider did not return a parcel boundary.",
              ]),
        },
        providerAttempts: [regridAttempt("matched")],
        warnings: [
          "Setbacks and maximum lot coverage require confirmation with the local planning authority.",
        ],
      },
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
      [regridAttempt(
        err instanceof Error && err.name === "AbortError" ? "timeout" : "provider-error",
        err instanceof Error && err.name === "AbortError"
          ? "Regrid exceeded the lookup timeout."
          : "Regrid could not complete the lookup.",
      )],
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
  priorAttempts: ProviderAttempt[] = [],
): Promise<NextResponse> {
  const [countyLookup, census] = await Promise.all([
    fetchCountyParcelWithDiagnostics(lat, lng),
    censusLocation,
  ]);
  const countyParcel = countyLookup.parcel;
  const providerAttempts = [...priorAttempts, ...countyLookup.attempts];

  // A GIS hit without a usable area cannot describe a lot, so it falls
  // through to the preset rather than yielding a zero-area parcel.
  if (countyParcel && (countyParcel.lotAreaSqft ?? 0) > 0) {
    return await countyGisResponse(
      lat,
      lng,
      requestedAddress,
      countyParcel,
      census,
      providerAttempts,
    );
  }
  return await presetFallbackResponse(
    lat,
    lng,
    requestedAddress,
    census,
    providerAttempts,
  );
}

/** Build a LiveParcelData from a free county/statewide GIS parcel polygon. */
async function countyGisResponse(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  countyParcel: CountyParcelResult,
  census: CensusLocation | null,
  providerAttempts: ProviderAttempt[],
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
  const retrievedAt = new Date().toISOString();
  const matchedProvider = providerAttempts.findLast(
    (attempt) => attempt.provider === "ArcGIS" && attempt.outcome === "matched",
  );
  const parcelSource = matchedProvider
    ? {
        provider: matchedProvider.provider,
        dataset: matchedProvider.dataset,
        sourceUrl: matchedProvider.sourceUrl,
      }
    : { provider: "ArcGIS", dataset: `${countyParcel.county} parcels` };
  const structuresSqft = positiveNumber(structures?.totalSqft);

  const parcel: LiveParcelData = {
    address: location.address,
    city: location.city,
    lotArea,
    lotWidth,
    lotLength,
    // County parcel layers describe land rather than structures. The free
    // USA Structures layer fills this only when it finds a positive footprint
    // whose published centroid lies inside the parcel; zero remains unknown.
    existingHouseSqft: structuresSqft ?? 0,
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
    dataQuality: {
      version: 1,
      fields: {
        address: fieldEvidence({
          status: "derived",
          confidence: "medium",
          source: userInputSource(),
          retrievedAt,
          warnings: [
            "The display address comes from the searched address and Census geography, not the parcel layer.",
          ],
        }),
        lotArea: fieldEvidence({
          status: "observed",
          confidence: "high",
          source: parcelSource,
          retrievedAt,
        }),
        lotDimensions: fieldEvidence({
          status: "derived",
          confidence: "medium",
          source: parcelSource,
          retrievedAt,
          warnings: ["Lot dimensions are derived from the parcel polygon."],
        }),
        existingHouseSqft: fieldEvidence({
          status: structuresSqft === null ? "unavailable" : "observed",
          confidence: structuresSqft === null ? "unknown" : "medium",
          source: usaStructuresSource(),
          retrievedAt,
          warnings: structuresSqft === null
            ? ["No building footprint was found; zero means unknown, not vacant."]
            : ["Imagery-derived building footprints can lag recent construction."],
        }),
        maxLotCoveragePercent: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: assumptionSource(),
          retrievedAt,
          warnings: [
            "The 40% maximum lot coverage is a planning assumption, not an address-specific rule.",
          ],
        }),
        setbacks: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: assumptionSource(),
          retrievedAt,
          warnings: ["Setbacks are planning assumptions, not address-specific rules."],
        }),
        zoning: fieldEvidence({
          status: "unavailable",
          confidence: "unknown",
          source: parcelSource,
          retrievedAt,
          warnings: ["The public parcel layer did not provide zoning."],
        }),
        boundaryGeoJson: fieldEvidence({
          status: "observed",
          confidence: "high",
          source: parcelSource,
          retrievedAt,
        }),
      },
      providerAttempts,
      warnings: [
        "Zoning, setbacks, and maximum lot coverage are unverified; confirm local planning rules.",
      ],
    },
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
  providerAttempts: ProviderAttempt[],
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
  const retrievedAt = new Date().toISOString();
  const presetSource = {
    provider: "LotFoundry",
    dataset: `Demo parcel preset: ${preset.id}`,
  };
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
    dataQuality: {
      version: 1,
      fields: {
        address: fieldEvidence({
          status: "derived",
          confidence: "medium",
          source: userInputSource(),
          retrievedAt,
          warnings: [
            "The display address comes from the searched address and Census geography.",
          ],
        }),
        lotArea: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: ["Lot area comes from a demo preset, not this property."],
        }),
        lotDimensions: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: ["Lot dimensions come from a demo preset, not this property."],
        }),
        existingHouseSqft: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: ["Existing-building area comes from a demo preset, not this property."],
        }),
        maxLotCoveragePercent: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: ["Maximum lot coverage is a demo planning assumption."],
        }),
        setbacks: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: ["Setbacks are demo planning assumptions."],
        }),
        zoning: fieldEvidence({
          status: "defaulted",
          confidence: "low",
          source: presetSource,
          retrievedAt,
          warnings: [
            "Zoning is an estimated demo category, not an address-specific designation.",
          ],
        }),
        boundaryGeoJson: fieldEvidence({
          status: "unavailable",
          confidence: "unknown",
          source: presetSource,
          retrievedAt,
          warnings: ["No parcel boundary provider matched this coordinate."],
        }),
      },
      providerAttempts,
      warnings: [
        "No configured parcel provider returned usable property data; physical and regulatory values are demo assumptions.",
      ],
    },
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function hasCompleteSetbacks(
  raw: Record<string, number> | null | undefined,
): boolean {
  if (!raw) return false;
  return [
    raw.front ?? raw.front_setback,
    raw.rear ?? raw.rear_setback,
    raw.side ?? raw.side_setback,
  ].every((value) => typeof value === "number" && Number.isFinite(value));
}

function userInputSource() {
  return {
    provider: "LotFoundry",
    dataset: "User-supplied address",
  };
}

function usaStructuresSource() {
  return {
    provider: "FEMA / ORNL",
    dataset: "USA Structures",
    sourceUrl:
      "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0",
  };
}

function assumptionSource() {
  return {
    provider: "LotFoundry",
    dataset: "Generic feasibility assumptions",
  };
}

function fieldEvidence(
  input: Omit<DataEvidence, "warnings"> & { warnings?: string[] },
): DataEvidence {
  return { ...input, warnings: input.warnings ?? [] };
}

function regridAttempt(
  outcome: ProviderAttempt["outcome"],
  detail?: string,
): ProviderAttempt {
  return {
    provider: "Regrid",
    dataset: "Parcel API v2",
    sourceUrl: "https://support.regrid.com/docs/source-lineage",
    outcome,
    ...(detail ? { detail } : {}),
  };
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
