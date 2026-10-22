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
import { fetchFireHazardZone } from "@/lib/server/fire-hazard-zones";
import {
  type StreetAddress,
  compareSitus,
  delimitStreetAddress,
  parseStreetAddress,
} from "@/lib/server/address-match";
import {
  type AddressParcelResult,
  type CountyParcelResult,
  addressStageDeadline,
  fetchCountyParcelByAddress,
  fetchCountyParcelWithDiagnostics,
  verifyParcelAddressAtPoint,
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
import { shadowClassifyZoning } from "@/lib/server/zoning-classifier";
import { deriveMaxCoverage } from "@/lib/server/zoning-heuristics";
import { canLookUpAttomAddress, fetchAttomAddress, type AttomLookup } from "@/lib/server/attom";
import { withAttomAddressEvidence } from "@/lib/server/attom-parcel";
import { requireApiAuth } from "@/lib/server/api-auth";

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
 * Where an official address-enriched layer is registered (King County and California),
 * a full `address` is also checked against it. A point-hit parcel is served as
 * the searched property only if the layer publishes that street address for it;
 * if the layer contradicts it, or the point found no parcel, the layer is asked
 * which single parcel publishes the address (see `reconcileAddressParcel`), and
 * otherwise the response falls back to the estimate with the reason recorded.
 * Other sources retain an explicit address-verification warning.
 *
 * The free US Census geocoder resolves state/ZIP/county alongside the chain
 * for every path, so financials key off the address's own geography even when
 * no parcel provider answers. Every California response, guest or not, also
 * carries the parcel's Fire Hazard Severity Zone from the keyless CAL FIRE and
 * City of San Diego maps (`lib/server/fire-hazard-zones.ts`), looked up in
 * parallel with the market data. Responses are cached for an hour.
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

  // Autocomplete selections bypass /api/geocode, so check their address here
  // too. Verify the token before spending ATTOM quota, and overlap the lookup
  // with the existing parcel providers. Guests keep the keyless chain.
  let attomLookup: Promise<AttomLookup> | undefined;
  if (!guest && process.env.ATTOM_API_KEY && requestedAddress && canLookUpAttomAddress(requestedAddress)) {
    const auth = await requireApiAuth(request);
    if (!(auth instanceof NextResponse)) attomLookup = fetchAttomAddress(requestedAddress);
  }
  const response = await resolveParcel(lat, lng, requestedAddress, guest);
  if (!attomLookup || !response.ok) return response;
  const data = await response.json() as LiveParcelData;
  return NextResponse.json(withAttomAddressEvidence(data, await attomLookup), {
    status: response.status,
    headers: response.headers,
  });
}

async function resolveParcel(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  guest: boolean,
): Promise<NextResponse> {
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

    if (regridRes.status === 401 || regridRes.status === 403) {
      console.error(JSON.stringify({
        severity: "ERROR",
        event: "regrid_auth_failed",
        status: regridRes.status,
      }));
      return await successWithoutRegrid(
        lat,
        lng,
        requestedAddress,
        censusLocation,
        [regridAttempt("auth-failed", "Regrid rejected the provider credential.")],
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

    // Paid point hits obey the same official identity requirement as guests.
    // A verified PIN always uses its own situs-layer polygon. An outage does
    // not assert a conflict, but must reduce confidence in the Regrid hit.
    const searchedAddress = fullStreetAddress(requestedAddress);
    const identityDeadline = addressStageDeadline();
    const regridIdentity = searchedAddress
      ? await verifyParcelAddressAtPoint(lat, lng, searchedAddress, identityDeadline)
      : undefined;
    if (regridIdentity?.verdict === "verified" && regridIdentity.parcel) {
      const situsAttempt = regridIdentity.attempts.findLast((attempt) => attempt.outcome === "matched");
      return await countyGisResponse(lat, lng, requestedAddress, regridIdentity.parcel,
        await censusLocation, [regridAttempt("matched"), ...regridIdentity.attempts], {
          identity: { kind: "verified", parcelId: regridIdentity.parcelId,
            localityConfirmed: regridIdentity.localityConfirmed, situsAttempt },
          boundaryAttempt: situsAttempt,
        });
    }
    if (regridIdentity?.verdict === "mismatch" && searchedAddress) {
      const lookup = await fetchCountyParcelByAddress(lat, lng, searchedAddress, identityDeadline);
      const attempts = [regridAttempt("invalid-response", "The official address layer contradicted the paid point hit."),
        ...regridIdentity.attempts, ...lookup.attempts];
      const census = await censusLocation;
      if (lookup.parcel) {
        const matched = lookup.parcel;
        return await countyGisResponse(matched.point.lat, matched.point.lng, requestedAddress,
          matched, census, attempts, {
            identity: { kind: "matched", parcelId: matched.parcelId, offsetFt: matched.offsetFt,
              localityConfirmed: matched.localityConfirmed, situsAttempt: matched.attempt },
            boundaryAttempt: matched.attempt,
          });
      }
      return await presetFallbackResponse(lat, lng, requestedAddress, census, attempts, "conflict");
    }
    const regridSitus = reconcileRegridSitus(fields, searchedAddress);
    const identityWarnings = [
      ...(regridIdentity?.verdict === "unverified"
        ? ["The official address layer could not confirm that this parcel is the searched street address; verify the parcel against county records."]
        : []),
      ...regridSitus.warnings,
    ];
    const identityConfidence: DataEvidence["confidence"] = regridSitus.conflict
      ? "low"
      : identityWarnings.length
        ? "medium"
        : "high";

    const regridFootprint = positiveNumber(fields.ll_bldg_footprint_sqft);
    const structuresPromise =
      regridFootprint === null && boundaryGeoJson
        ? fetchBuildingFootprint(boundaryGeoJson)
        : Promise.resolve(null);
    // Needs only the state, so it starts as soon as the geocoder answers and
    // overlaps the footprint and market lookups. Neither promise rejects.
    const fireHazardPromise = censusLocation.then((census) =>
      fetchFireHazardZone({
        lat,
        lng,
        polygon: boundaryGeoJson,
        state: mergeLocations(extractRegridLocation(fields), census).state,
      }),
    );

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
    // Shadow only: Jev's read of the district class is logged next to the
    // regex verdicts and never touches this response. Started here so it
    // overlaps the market-data lookup; it cannot reject.
    const zoningShadow = shadowClassifyZoning({
      zoning: fields.zoning,
      description: fields.zoning_description,
      state: loc.state,
      county: loc.county,
      city: fields.scity ?? fields.city,
    });
    const [marketData, fireHazard] = await Promise.all([
      resolveMarketData({ lat, lng, ...loc }),
      fireHazardPromise,
    ]);
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
    const structureWarnings = [
      "Imagery-derived building footprints can lag recent construction.",
      ...(structures && structures.structureCount > 1
        ? [
            `Total includes ${structures.structureCount} mapped structures on the parcel (largest ${structures.largestSqft.toLocaleString()} sq ft).`,
          ]
        : []),
    ];
    const footprintEvidence = regridFootprint !== null
      ? evidence("observed", "high")
      : structuresFootprint !== null
        ? evidence("observed", "medium", structureWarnings, usaStructuresSource())
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
      ...(fireHazard ? { fireHazard } : {}),
      dataQuality: {
        version: 1,
        fields: {
          address: addressObserved
            ? evidence("observed", identityConfidence, identityWarnings)
            : evidence("derived", "medium", [
                "The provider did not publish a situs address; the searched address or coordinates were used.",
              ], userInputSource()),
          lotArea: evidence("observed", identityConfidence, identityWarnings),
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
            ? evidence("observed", identityConfidence, identityWarnings)
            : evidence("unavailable", "unknown", [
                "The provider did not return a parcel boundary.",
              ]),
        },
        providerAttempts: [regridAttempt("matched"), ...(regridIdentity?.attempts ?? [])],
        warnings: [
          "Setbacks and maximum lot coverage require confirmation with the local planning authority.",
          ...identityWarnings,
        ],
      },
    };

    await zoningShadow;
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
  // The geometry layer that answered the point lookup; the address checks below
  // add their own attempts and must not be mistaken for the boundary's source.
  const pointAttempt = countyLookup.attempts.findLast(
    (attempt) => attempt.provider === "ArcGIS" && attempt.outcome === "matched",
  );
  const address = fullStreetAddress(requestedAddress);
  // One deadline for the whole address stage (verify, then look up).
  const deadline = addressStageDeadline();

  // A point parcel that the official address layer contradicts is not the
  // searched property, however well the polygon contains the point.
  let contradicted = false;
  if (countyParcel && (countyParcel.lotAreaSqft ?? 0) > 0) {
    let identity: AddressIdentity | undefined;
    if (address) {
      const check = await verifyParcelAddressAtPoint(lat, lng, address, deadline);
      providerAttempts.push(...check.attempts);
      if (check.verdict === "verified" && check.parcel) {
        // The PIN and boundary must come from the same official feature, not
        // two independently selected overlapping/condominium tax parcels.
        return await countyGisResponse(lat, lng, requestedAddress, check.parcel, census, providerAttempts, {
          identity: {
            kind: "verified", parcelId: check.parcelId,
            localityConfirmed: check.localityConfirmed,
            situsAttempt: check.attempts.findLast((attempt) => attempt.outcome === "matched"),
          },
          boundaryAttempt: check.attempts.findLast((attempt) => attempt.outcome === "matched"),
        });
      } else if (check.verdict === "verified") {
        identity = { kind: "unverified" };
      } else if (check.verdict === "unverified") {
        identity = { kind: "unverified" };
      } else if (check.verdict === "mismatch") {
        contradicted = true;
      }
      // "unsupported": no address layer is registered here, so nothing was
      // asked and the response is exactly what it was before.
    }
    // A GIS hit without a usable area cannot describe a lot, so it falls
    // through to the preset rather than yielding a zero-area parcel.
    if (!contradicted) {
      return await countyGisResponse(
        lat,
        lng,
        requestedAddress,
        countyParcel,
        census,
        providerAttempts,
        { identity, boundaryAttempt: pointAttempt },
      );
    }
  }

  // Either the point found no parcel or its parcel was contradicted. A geocoder
  // can return a street-side, interpolated, or next-door point for a real
  // address, so before settling for a demo preset, ask the official address
  // layer which single parcel publishes that street address.
  const reconciliation =
    countyParcel && !contradicted
      ? null
      : await reconcileAddressParcel(
          lat,
          lng,
          address,
          countyLookup.attempts,
          contradicted,
          deadline,
        );
  if (reconciliation) providerAttempts.push(...reconciliation.attempts);
  if (reconciliation?.parcel) {
    const matched = reconciliation.parcel;
    return await countyGisResponse(
      matched.point.lat,
      matched.point.lng,
      requestedAddress,
      matched,
      census,
      providerAttempts,
      {
        identity: {
          kind: "matched",
          parcelId: matched.parcelId,
          offsetFt: matched.offsetFt,
          localityConfirmed: matched.localityConfirmed,
          situsAttempt: matched.attempt,
        },
        boundaryAttempt: matched.attempt,
      },
    );
  }
  return await presetFallbackResponse(
    lat,
    lng,
    requestedAddress,
    census,
    providerAttempts,
    contradicted
      ? "conflict"
      : reconciliation !== null && reconciliation.attempts.length > 0
        ? "unresolved"
        : undefined,
  );
}

/**
 * The searched address, when it is complete enough to verify a parcel against:
 * a numbered street line plus a city or ZIP. A bare "1421 NE 88th St" is never
 * checked, so one town's street cannot match another's.
 */
function fullStreetAddress(requestedAddress: string | undefined): StreetAddress | null {
  const address = parseStreetAddress(requestedAddress);
  return address && (address.city || address.zip) ? address : null;
}

/**
 * Reconcile Regrid's situs fields (`saddress`, `scity`, `state2`, `szip5`)
 * against the searched street address. Mailing fields (`address`, `city`,
 * `state`, `zip`) are intentionally ignored here because they can belong to an
 * off-site owner rather than the physical parcel.
 */
function reconcileRegridSitus(
  fields: Record<string, unknown>,
  searched: StreetAddress | null,
): { conflict: boolean; warnings: string[] } {
  const situsLine = stringValue(fields.saddress);
  if (!searched || !situsLine) {
    return { conflict: false, warnings: [] };
  }
  const scity = stringValue(fields.scity);
  const state2 = stringValue(fields.state2)?.toUpperCase();
  const szip5 = stringValue(fields.szip5)?.slice(0, 5);
  const comparison = compareSitus(searched, {
    line: situsLine,
    cities: scity ? [scity] : [],
    ...(szip5 && /^\d{5}$/.test(szip5) ? { zip: szip5 } : {}),
    ...(state2 && /^[A-Z]{2}$/.test(state2) ? { state: state2 } : {}),
  });
  if (comparison.verdict === "different-address") {
    return {
      conflict: true,
      warnings: [
        `The parcel provider's situs street address (${situsLine}) differs from the searched street address; verify parcel boundaries against county records.`,
      ],
    };
  }
  if (comparison.verdict === "locality-conflict") {
    const situsLocality = [scity, state2, szip5].filter(Boolean).join(" ");
    return {
      conflict: true,
      warnings: [
        `The parcel provider's situs locality (${situsLocality || "unlisted"}) conflicts with the searched locality; confirm jurisdiction and ZIP.`,
      ],
    };
  }
  return { conflict: false, warnings: [] };
}

/**
 * How a parcel's official street address relates to the searched one. Absent
 * means no address layer covers the area, so nothing was checked.
 *
 * - `verified`: the official parcel at the searched point publishes the address.
 * - `matched`: the point missed or contradicted, and the one parcel publishing
 *   the address was found by looking it up.
 * - `unverified`: an address layer covers the area but could not answer.
 */
interface AddressIdentity {
  kind: "verified" | "matched" | "unverified";
  /** The official parcel identifier the address was verified against. */
  parcelId?: string;
  /** Feet from the searched point to the matched parcel (`matched` only). */
  offsetFt?: number;
  /** Whether the layer's own city or ZIP confirmed the address. */
  localityConfirmed?: boolean;
  /** The address-layer attempt that vouched for the address. */
  situsAttempt?: ProviderAttempt;
}

/**
 * Address-driven reconciliation for a searched address whose point found no
 * parcel, or whose point parcel the official address layer contradicted.
 * Returns null when there is nothing to reconcile: no full street address was
 * supplied, or (for a point miss) no service ever answered "nothing here" — an
 * outage would only repeat and double the caller's wait.
 *
 * Runs only against the free public address layers, so it is identical for
 * guests and members and can never spend metered Google or Regrid quota.
 */
async function reconcileAddressParcel(
  lat: number,
  lng: number,
  address: StreetAddress | null,
  pointAttempts: ProviderAttempt[],
  contradicted: boolean,
  deadline: number,
): Promise<{ parcel: AddressParcelResult | null; attempts: ProviderAttempt[] } | null> {
  if (!address) return null;
  if (
    !contradicted &&
    !pointAttempts.some(
      (attempt) => attempt.outcome === "no-match" || attempt.outcome === "invalid-response",
    )
  ) {
    return null;
  }
  const lookup = await fetchCountyParcelByAddress(lat, lng, address, deadline);
  // A point whose parcel was contradicted stays "refused" even when no address
  // layer produced an attempt (e.g. the stage ran out of time).
  return lookup.attempts.length === 0 && !contradicted && !lookup.parcel ? null : lookup;
}

/**
 * Build a LiveParcelData from a free county/statewide GIS parcel polygon.
 *
 * `options.identity` records how the parcel's official street address relates
 * to the searched one (absent when no address layer covers the area, which
 * leaves the response exactly as it was). A parcel found by looking the address
 * up (`matched`) is reported at lower confidence than a point hit, and its
 * `lat`/`lng` are the in-parcel point the caller passes in. `boundaryAttempt`
 * names the layer whose geometry this is.
 */
async function countyGisResponse(
  lat: number,
  lng: number,
  requestedAddress: string | undefined,
  countyParcel: CountyParcelResult,
  census: CensusLocation | null,
  providerAttempts: ProviderAttempt[],
  options: { identity?: AddressIdentity; boundaryAttempt?: ProviderAttempt } = {},
): Promise<NextResponse> {
  const { identity, boundaryAttempt } = options;
  const lotArea = countyParcel.lotAreaSqft as number;
  const polygonDimensions = orientedLotDimensions(countyParcel.polygon, lotArea);
  const { lotWidth, lotLength } = polygonDimensions ?? estimateLotDimensions(lotArea);

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
  const [marketData, structures, fireHazard] = await Promise.all([
    resolveMarketData({ lat, lng, ...loc }),
    fetchBuildingFootprint(countyParcel.polygon),
    fetchFireHazardZone({ lat, lng, polygon: countyParcel.polygon, state: loc.state }),
  ]);
  const retrievedAt = new Date().toISOString();
  const parcelSource = {
    provider: boundaryAttempt?.provider ?? "ArcGIS",
    dataset: boundaryAttempt?.dataset ?? `${countyParcel.county} parcels`,
    ...(boundaryAttempt?.sourceUrl ? { sourceUrl: boundaryAttempt.sourceUrl } : {}),
    // The official parcel identifier the searched address was verified against.
    ...(identity?.parcelId ? { recordId: identity.parcelId } : {}),
  };
  // Geometry and area come from an official record either way. Confidence in
  // "this is the searched lot" depends on how the address was tied to it: a
  // verified point hit is as strong as before, a parcel found by looking the
  // address up (point moved) or one the address layer could not confirm is not.
  const addressVerified = identity?.kind === "verified" || identity?.kind === "matched";
  const boundaryConfidence: DataEvidence["confidence"] =
    identity?.kind === "matched" || identity?.kind === "unverified" ||
    (fullStreetAddress(requestedAddress) && !addressVerified) ? "medium" : "high";
  const boundaryWarnings =
    identity?.kind === "matched"
      ? [
          `The searched point did not fall on a parcel published under the searched address, so this parcel was matched by its published street address instead (${identity.offsetFt ?? 0} ft from the searched point) and the reported coordinates were moved inside it.${
            identity.localityConfirmed === false
              ? " The layer published no city or ZIP to confirm the match."
              : ""
          } Verify the parcel against county records.`,
        ]
      : identity?.kind === "unverified"
        ? [
            "The official address layer could not confirm that this parcel is the searched street address; verify the parcel against county records.",
          ]
        : fullStreetAddress(requestedAddress) && !addressVerified
          ? ["The parcel boundary contains the searched point, but no official address record confirmed its street address."]
          : [];
  // Only a parcel whose official address was actually checked earns a
  // stronger address record than "the searched text"; the display value is
  // still the searched address, hence derived, not observed.
  const addressSource = identity?.situsAttempt
    ? {
        provider: identity.situsAttempt.provider,
        dataset: identity.situsAttempt.dataset,
        ...(identity.situsAttempt.sourceUrl
          ? { sourceUrl: identity.situsAttempt.sourceUrl }
          : {}),
        ...(identity.parcelId ? { recordId: identity.parcelId } : {}),
      }
    : undefined;
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
    ...(fireHazard ? { fireHazard } : {}),
    dataQuality: {
      version: 1,
      fields: {
        address:
          addressVerified && addressSource
            ? fieldEvidence({
                status: "derived",
                confidence: identity?.localityConfirmed === false ? "medium" : "high",
                source: addressSource,
                retrievedAt,
                warnings: [
                  "The display address is the searched address, checked against the parcel's official published street address.",
                  ...(identity?.kind === "matched" ? boundaryWarnings : []),
                ],
              })
            : fieldEvidence({
                status: "derived",
                confidence: "medium",
                source: userInputSource(),
                retrievedAt,
                warnings: [
                  "The display address comes from the searched address and Census geography, not the parcel layer.",
                  ...boundaryWarnings,
                ],
              }),
        lotArea: fieldEvidence({
          status: countyParcel.areaBasis === "geometry" ? "derived" : "observed",
          confidence: boundaryConfidence,
          source: parcelSource,
          retrievedAt,
          warnings: [
            ...boundaryWarnings,
            ...(countyParcel.areaBasis === "geometry" ? ["Lot area is calculated from the published polygon, including holes; no area attribute was available for this part."] : []),
          ],
        }),
        lotDimensions: fieldEvidence({
          status: polygonDimensions ? "derived" : "defaulted",
          confidence: "medium",
          source: parcelSource,
          retrievedAt,
          warnings: [polygonDimensions ? "Lot dimensions are an enclosing rectangle derived from the parcel polygon, not measured frontage." : "Lot dimensions are estimated from area; the polygon did not yield usable dimensions."],
        }),
        existingHouseSqft: fieldEvidence({
          status: structuresSqft === null ? "unavailable" : "observed",
          confidence: structuresSqft === null ? "unknown" : "medium",
          source: usaStructuresSource(),
          retrievedAt,
          warnings: structuresSqft === null
            ? ["No building footprint was found; zero means unknown, not vacant."]
            : [
                "Imagery-derived building footprints can lag recent construction.",
                ...(structures && structures.structureCount > 1
                  ? [
                      `Total includes ${structures.structureCount} mapped structures on the parcel (largest ${structures.largestSqft.toLocaleString()} sq ft).`,
                    ]
                  : []),
              ],
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
          confidence: boundaryConfidence,
          source: parcelSource,
          retrievedAt,
          warnings: boundaryWarnings,
        }),
      },
      providerAttempts,
      warnings: [
        "Zoning, setbacks, and maximum lot coverage are unverified; confirm local planning rules.",
        ...boundaryWarnings,
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
  addressIssue?: "unresolved" | "conflict",
): Promise<NextResponse> {
  const preset = nearestPreset(lat, lng);
  // Set when a street-address check ran and still found no single official
  // parcel, so the fallback says the match was tried rather than never made.
  // `conflict` is stronger: the official address layer positively contradicted
  // the parcel at the searched point, so the point's parcel was withheld.
  const issueWarnings =
    addressIssue === "conflict"
      ? [
          "The parcel at the searched point is published under a different street address than the one searched, and no single official parcel matched the searched address; the parcel shown is an estimate, not the searched property.",
        ]
      : addressIssue === "unresolved"
        ? [
            "The searched street address could not be matched to a single official parcel record.",
          ]
        : [];
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
  // The preset lends dimensions only; the fire zone is the searched point's own.
  const [marketData, fireHazard] = await Promise.all([
    resolveMarketData({ lat, lng, ...loc }),
    fetchFireHazardZone({ lat, lng, state: loc.state }),
  ]);
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
    existingHouseSqft: 0,
    maxLotCoveragePercent: preset.maxLotCoveragePercent,
    setbacks: preset.setbacks,
    zoning: "Unknown",
    boundaryGeoJson: null,
    lat,
    lng,
    source: "fallback",
    state: loc.state,
    zip: loc.zip,
    county: loc.county,
    marketData,
    ...(fireHazard ? { fireHazard } : {}),
    dataQuality: {
      version: 1,
      fields: {
        address: fieldEvidence({
          status: "derived",
          // No source verified this address against a parcel; when a check ran
          // and failed, that is recorded here as evidence rather than dropped.
          confidence: addressIssue ? "low" : "medium",
          source: userInputSource(),
          retrievedAt,
          warnings: [
            "The display address comes from the searched address and Census geography.",
            ...issueWarnings,
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
          status: "unavailable",
          confidence: "unknown",
          source: presetSource,
          retrievedAt,
          warnings: ["Existing building footprint is unknown; no property measurement was returned."],
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
          warnings: [
            "No parcel boundary provider matched this coordinate.",
            ...issueWarnings,
          ],
        }),
      },
      providerAttempts,
      warnings: [
        "No configured parcel provider returned usable property data; physical and regulatory values are demo assumptions.",
        ...issueWarnings,
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

  const [street, ...rest] = delimitStreetAddress(requestedAddress)
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
