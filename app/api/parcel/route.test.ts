import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import { clearZoningCache } from "@/lib/server/zoning-classifier";
import { GET } from "./route";
import { extractRegridLocation } from "@/lib/server/parcel-location";
import type { LiveParcelData } from "@/lib/parcel-types";

/**
 * These tests exercise the GET route handler's Regrid → LiveParcelData
 * transform and its fallback/error paths. lib/parcel-api.test.ts only covers
 * the client fetch; this covers the server-side mapper.
 *
 * The mock follows Regrid's documented v2 point-query response shape:
 * `parcels.features[].properties.fields`.
 */

function parcelUrl(lat: number, lng: number, address?: string): URL {
  const url = new URL("http://localhost/api/parcel");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  if (address) url.searchParams.set("address", address);
  return url;
}

/** A signed-in caller: carries a bearer token, so paid Regrid is eligible. */
function makeRequest(lat: number, lng: number, address?: string): NextRequest {
  return new NextRequest(parcelUrl(lat, lng, address), {
    headers: { authorization: "Bearer test-token" },
  });
}

/** An anonymous caller: no token, so the route must stay on the free chain. */
function makeGuestRequest(lat: number, lng: number, address?: string): NextRequest {
  return new NextRequest(parcelUrl(lat, lng, address));
}

/** A Regrid feature with the fields the route requests. */
function regridResponse(fields: Record<string, unknown>, geometry: unknown = null) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      parcels: {
        type: "FeatureCollection",
        features: [{ properties: { fields }, geometry }],
      },
    }),
  };
}

/**
 * A closed GeoJSON ring for a widthFt × lengthFt rectangle rotated by
 * `degrees`, centered at (latC, lngC). Uses the same latitude-corrected
 * ft-per-degree scales as lib/parcel-geometry so dimensions round-trip.
 */
function rotatedRectPolygon(
  latC: number,
  lngC: number,
  widthFt: number,
  lengthFt: number,
  degrees: number,
) {
  const rad = (degrees * Math.PI) / 180;
  const lngScale = 364000 * Math.cos((latC * Math.PI) / 180);
  const corners: Array<[number, number]> = [
    [-widthFt / 2, -lengthFt / 2],
    [widthFt / 2, -lengthFt / 2],
    [widthFt / 2, lengthFt / 2],
    [-widthFt / 2, lengthFt / 2],
  ];
  const ring = corners.map(([x, y]) => {
    const rx = x * Math.cos(rad) - y * Math.sin(rad);
    const ry = x * Math.sin(rad) + y * Math.cos(rad);
    return [lngC + rx / lngScale, latC + ry / 364000];
  });
  ring.push(ring[0]);
  return { type: "Polygon", coordinates: [ring] };
}

/** A US Census `onelineaddress` match, the shape the route parses. */
function censusAddressResponse(
  matchedAddress: string,
  state: string,
  county: string,
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      result: {
        addressMatches: [
          {
            matchedAddress,
            geographies: {
              States: [{ STUSAB: state }],
              Counties: [{ BASENAME: county }],
            },
          },
        ],
      },
    }),
  };
}

/** A US Census `coordinates` reverse match — carries no ZIP by design. */
function censusCoordinateResponse(state: string, county: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      result: {
        geographies: {
          States: [{ STUSAB: state }],
          Counties: [{ BASENAME: county }],
        },
      },
    }),
  };
}

/** An ArcGIS `f=geojson` parcel hit from a county/statewide GIS service. */
function countyGisResponse(geometry: unknown, properties: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ features: [{ type: "Feature", geometry, properties }] }),
  };
}

function structuresResponse(
  sqft: number,
  lng = -122.31,
  lat = 47.65,
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      features: [
        { attributes: { SQFEET: sqft, LONGITUDE: lng, LATITUDE: lat } },
      ],
    }),
  };
}

const EMPTY_FEATURES = {
  ok: true,
  status: 200,
  json: async () => ({ features: [] }),
};

/**
 * Route fetches by host so a test can describe each provider independently.
 * Anything unlisted resolves empty rather than reaching the network — the
 * chain now calls three services, and none of them belong in a unit test.
 */
function stubProviders(providers: {
  regrid?: unknown;
  census?: unknown;
  countyGis?: unknown;
  structures?: unknown;
}) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes("regrid.com")) return providers.regrid ?? EMPTY_FEATURES;
    if (url.includes("geocoding.geo.census.gov")) {
      return providers.census ?? EMPTY_FEATURES;
    }
    if (url.includes("USA_Structures_View")) {
      return providers.structures ?? EMPTY_FEATURES;
    }
    return providers.countyGis ?? EMPTY_FEATURES;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Guests and members use separate limiter namespaces; clearing keeps a long
  // describe block from tripping either one.
  resetRateLimitBuckets();
  vi.stubEnv("REGRID_API_KEY", "test-token");
  // Default every test to a fully offline provider chain; tests that care
  // about a provider override it explicitly.
  stubProviders({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/parcel — Regrid field mapping", () => {
  it("uses Regrid's current v2 point endpoint and supported parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(regridResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await GET(makeRequest(47.65, -122.31));

    const regridCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("regrid.com"),
    );
    expect(regridCalls).toHaveLength(1);
    const requestedUrl = new URL(regridCalls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v2/parcels/point");
    expect(requestedUrl.searchParams.get("lat")).toBe("47.65");
    expect(requestedUrl.searchParams.get("lon")).toBe("-122.31");
    expect(requestedUrl.searchParams.get("token")).toBe("test-token");
    expect(requestedUrl.searchParams.get("limit")).toBe("1");
    expect(requestedUrl.searchParams.has("fields")).toBe(false);
  });

  it("maps Regrid fields to LiveParcelData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25, // 0.25 * 43560 = 10890 sq ft
          ll_bldg_footprint_sqft: 1500,
          zoning: "R-1",
          address: "123 Oak St",
          city: "Seattle",
          state: "WA",
          zip: "98105",
        }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("123 Oak St");
    expect(data.city).toBe("Seattle, WA 98105");
    expect(data.lotArea).toBe(10890);
    expect(data.existingHouseSqft).toBe(1500);
    expect(data.zoning).toBe("R-1");
    expect(data.maxLotCoveragePercent).toBe(40); // R-1 → 40%
    // Regrid's standard schema has no setbacks, so these resolve to defaults.
    expect(data.setbacks).toEqual({ front: 20, rear: 20, side: 5 });
    expect(data.lat).toBe(47.65);
    expect(data.lng).toBe(-122.31);
  });

  it("labels observed, derived, and defaulted parcel fields independently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25,
          ll_bldg_footprint_sqft: 1500,
          ll_uuid: "parcel-123",
          ll_last_refresh: "2026-08-14",
          zoning: "R-1",
          saddress: "123 Oak St",
          scity: "Seattle",
          state2: "WA",
          szip5: "98105",
        }),
      ),
    );

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData & {
      dataQuality?: {
        fields: Record<string, { status: string; source: { recordId?: string }; sourceAsOf?: string }>;
      };
    };

    expect(data.dataQuality?.fields.lotArea.status).toBe("observed");
    expect(data.dataQuality?.fields.lotArea.source.recordId).toBe("parcel-123");
    expect(data.dataQuality?.fields.lotArea.sourceAsOf).toBe("2026-08-14");
    expect(data.dataQuality?.fields.existingHouseSqft.status).toBe("observed");
    expect(data.dataQuality?.fields.maxLotCoveragePercent.status).toBe("derived");
    expect(data.regulationsEstimated).toBe(true);
    expect(data.dataQuality?.fields.setbacks.status).toBe("defaulted");
  });

  it("does not turn a missing Regrid lot area into a 5,000 sq ft fact", async () => {
    const countyPolygon = rotatedRectPolygon(47.65, -122.31, 50, 120, 0);
    stubProviders({
      regrid: regridResponse({ zoning: "R-1", saddress: "123 Oak St" }),
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(countyPolygon, { Shape__Area: 6000 }),
    });

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBe(6000);
  });

  it("rejects a Regrid polygon that does not contain the requested point", async () => {
    const wrongPolygon = rotatedRectPolygon(47.7, -122.4, 50, 120, 0);
    const countyPolygon = rotatedRectPolygon(47.65, -122.31, 50, 120, 0);
    stubProviders({
      regrid: regridResponse({ ll_gisacre: 0.14, zoning: "R-1" }, wrongPolygon),
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(countyPolygon, { Shape__Area: 6000 }),
    });

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.dataQuality?.providerAttempts).toContainEqual(
      expect.objectContaining({ provider: "Regrid", outcome: "invalid-response" }),
    );
  });

  it("prefers Regrid's situs fields over the mailing-address fields", async () => {
    // `saddress`/`scity` describe the property; `address`/`city` can carry the
    // owner's mailing address, which belongs to a different lot entirely.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25,
          zoning: "R-1",
          saddress: "123 Oak St",
          address: "PO Box 4120",
          scity: "Seattle",
          city: "Bellevue",
          state2: "WA",
          state: "OR",
          szip5: "98105",
          zip: "97201",
        }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.address).toBe("123 Oak St");
    expect(data.city).toBe("Seattle, WA 98105");
  });

  it("falls back to coordinates when the address field is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.1, zoning: "R-2" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("47.65000, -122.31000");
    expect(data.maxLotCoveragePercent).toBe(45); // R-2 → 45%
  });

  it("uses sqft for footprint when ll_bldg_footprint_sqft is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.2, sqft: 980, zoning: "R-1" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.existingHouseSqft).toBe(980);
  });

  it("uses USA Structures when Regrid omits a ground footprint", async () => {
    const parcelPolygon = rotatedRectPolygon(47.65, -122.31, 50, 120, 0);
    stubProviders({
      regrid: regridResponse({ ll_gisacre: 0.14, zoning: "R-1" }, parcelPolygon),
      structures: structuresResponse(1234),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.existingHouseSqft).toBe(1234);
  });

  it("does not call USA Structures when Regrid provides a ground footprint", async () => {
    const parcelPolygon = rotatedRectPolygon(47.65, -122.31, 50, 120, 0);
    const fetchMock = stubProviders({
      regrid: regridResponse(
        { ll_gisacre: 0.14, ll_bldg_footprint_sqft: 1400, zoning: "R-1" },
        parcelPolygon,
      ),
      structures: structuresResponse(999),
    });

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData;

    expect(data.existingHouseSqft).toBe(1400);
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("USA_Structures_View")),
    ).toBe(false);
  });

  it("derives oriented (not axis-aligned) dimensions from a rotated parcel polygon", async () => {
    // A 50ft × 100ft lot rotated 30° at Seattle latitude. The old axis-aligned
    // bounding box (with its hardcoded 288000 ft/° longitude scale) inflates
    // this to ~93 × ~112; the oriented bounding box recovers the true 50 × 100.
    const geometry = rotatedRectPolygon(47.65, -122.31, 50, 100, 30);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 5000 / 43560, zoning: "R-1" }, geometry),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.lotWidth).toBeGreaterThanOrEqual(49);
    expect(data.lotWidth).toBeLessThanOrEqual(51);
    expect(data.lotLength).toBeGreaterThanOrEqual(99);
    expect(data.lotLength).toBeLessThanOrEqual(101);
  });

  it("estimates proportional dimensions from lot area when Regrid returns no geometry", async () => {
    // 10890 sq ft with no polygon: the area estimator (~2:1 depth-to-width)
    // gives 74 × 147 — not the old hardcoded 40 ft width (which forced 40 × 272).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.25, zoning: "R-1" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.lotWidth).toBe(74);
    expect(data.lotLength).toBe(147);
  });

  it("returns a fallback preset (source=fallback) when Regrid has no features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          parcels: { type: "FeatureCollection", features: [] },
        }),
      }),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("Unknown");
  });

  it("returns a fallback when the Regrid fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
  });

  it("keeps the searched address visible when returning fallback estimates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    const res = await GET(
      makeRequest(39.752, -104.999, "456 Pine St, Denver, CO 80202, USA"),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.address).toBe("456 Pine St");
    expect(data.city).toBe("Denver, CO 80202, USA");
  });

  it("uses the searched address when Regrid has no address fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.1, zoning: "R-2" }),
      ),
    );

    const res = await GET(
      makeRequest(37.33, -121.89, "123 Main St, San Jose, CA 95110"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("123 Main St");
    expect(data.city).toBe("San Jose, CA 95110");
  });

  it("degrades to county GIS when Regrid rate-limits (429)", async () => {
    // Rate limiting is a provider failure, not a request failure. The free
    // public chain still answers, so the lookup must not surface an error.
    stubProviders({
      regrid: { ok: false, status: 429, json: async () => ({}) },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(
        rotatedRectPolygon(47.65, -122.31, 50, 120, 0),
        { Shape__Area: 6000 },
      ),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);

    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBe(6000);
  });

  it("reports a sanitized auth failure and degrades to county GIS on Regrid 401", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubProviders({
      regrid: { ok: false, status: 401, json: async () => ({}) },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(
        rotatedRectPolygon(47.65, -122.31, 50, 120, 0),
        { Shape__Area: 6000 },
      ),
    });

    const res = await GET(makeRequest(47.65, -122.31, "123 Secret St, Seattle, WA"));
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBe(6000);
    expect(data.dataQuality?.providerAttempts).toContainEqual(
      expect.objectContaining({ provider: "Regrid", outcome: "auth-failed" }),
    );
    expect(error).toHaveBeenCalledOnce();
    const line = String(error.mock.calls[0][0]);
    expect(JSON.parse(line)).toEqual({
      severity: "ERROR",
      event: "regrid_auth_failed",
      status: 401,
    });
    expect(line).not.toContain("test-token");
    expect(line).not.toContain("regrid.com");
    expect(line).not.toContain("123 Secret St");
  });

  it("reports a sanitized auth failure and degrades to county GIS on Regrid 403", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubProviders({
      regrid: { ok: false, status: 403, json: async () => ({}) },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(
        rotatedRectPolygon(47.65, -122.31, 50, 120, 0),
        { Shape__Area: 6000 },
      ),
    });

    const res = await GET(makeRequest(47.65, -122.31, "123 Secret St, Seattle, WA"));
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBe(6000);
    expect(data.dataQuality?.providerAttempts).toContainEqual(
      expect.objectContaining({ provider: "Regrid", outcome: "auth-failed" }),
    );
    expect(error).toHaveBeenCalledOnce();
    const line = String(error.mock.calls[0][0]);
    expect(JSON.parse(line)).toEqual({
      severity: "ERROR",
      event: "regrid_auth_failed",
      status: 403,
    });
    expect(line).not.toContain("test-token");
    expect(line).not.toContain("regrid.com");
    expect(line).not.toContain("123 Secret St");
  });

  it("degrades to the preset fallback when Regrid rate-limits with no GIS cover", async () => {
    stubProviders({
      regrid: { ok: false, status: 429, json: async () => ({}) },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: EMPTY_FEATURES,
    });

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);

    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
  });

  it("400s when lat/lng are missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/parcel"));
    expect(res.status).toBe(400);
  });

  it("400s when lat/lng are out of range", async () => {
    const res = await GET(makeRequest(200, -122.31));
    expect(res.status).toBe(400);
  });

  it("returns a preset fallback (not 500) when REGRID_API_KEY is unconfigured", async () => {
    // Keyless demo: the route degrades to the nearest sample preset so a
    // geocoded address still resolves to a visible parcel.
    vi.stubEnv("REGRID_API_KEY", "");
    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("Unknown");
  });
});

describe("GET /api/parcel — Census geocoder location", () => {
  it("fills state/ZIP/county from the Census when Regrid omits them", async () => {
    stubProviders({
      regrid: regridResponse({ ll_gisacre: 0.25, zoning: "R-1" }),
      census: censusAddressResponse(
        "1418 NW 65TH ST, SEATTLE, WA, 98117",
        "WA",
        "King",
      ),
    });

    const res = await GET(
      makeRequest(47.676, -122.3747, "1418 NW 65th St, Seattle, WA"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.state).toBe("WA");
    expect(data.zip).toBe("98117");
    expect(data.county).toBe("King");
  });

  it("keeps Regrid's own location fields when it has them", async () => {
    stubProviders({
      regrid: regridResponse({
        ll_gisacre: 0.25,
        zoning: "R-1",
        state2: "OR",
        szip5: "97212",
        county: "Multnomah County",
      }),
      census: censusAddressResponse("WRONG ST, SEATTLE, WA, 98117", "WA", "King"),
    });

    const res = await GET(makeRequest(45.54, -122.63, "123 NE 20th Ave, Portland, OR"));
    const data = (await res.json()) as LiveParcelData;

    expect(data.state).toBe("OR");
    expect(data.zip).toBe("97212");
    expect(data.county).toBe("Multnomah");
  });

  it("resolves state/county from coordinates when the address does not match", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("fallback");
    expect(data.state).toBe("WA");
    expect(data.county).toBe("King");
    // The coordinate endpoint carries no ZIP and no address was supplied.
    expect(data.zip).toBe("");
  });

  it("still answers when the Census geocoder is unreachable", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      if (String(input).includes("geocoding.geo.census.gov")) {
        throw new TypeError("Network error");
      }
      return regridResponse({ ll_gisacre: 0.25, zoning: "R-1" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("regrid");
    expect(data.state).toBe("");
  });
});

describe("GET /api/parcel — free county/statewide GIS tier", () => {
  /** A ~50x120 ft King County lot around the fixture point. */
  const KING_LOT = rotatedRectPolygon(47.65, -122.31, 50, 120, 0);

  it("uses county GIS geometry when Regrid returns no parcel", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(KING_LOT, { Shape__Area: 6000 }),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBe(6000);
    expect(data.boundaryGeoJson).not.toBeNull();
    expect(data.lotWidth).toBe(50);
    expect(data.lotLength).toBe(120);
    // A county lot layer describes the land, not the house on it.
    expect(data.existingHouseSqft).toBe(0);
    expect(data.zoning).toBe("Unknown");
  });

  it("marks county geometry as observed and regulatory assumptions as defaulted", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(KING_LOT, { Shape__Area: 6000 }),
      structures: structuresResponse(1675),
    });

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData & {
      dataQuality?: {
        fields: Record<string, { status: string; source: { provider: string } }>;
        providerAttempts: Array<{ outcome: string; provider: string }>;
      };
    };

    expect(data.dataQuality?.fields.lotArea.status).toBe("observed");
    expect(data.dataQuality?.fields.boundaryGeoJson.status).toBe("observed");
    expect(data.dataQuality?.fields.existingHouseSqft.source.provider).toBe("FEMA / ORNL");
    expect(data.dataQuality?.fields.maxLotCoveragePercent.status).toBe("defaulted");
    expect(data.dataQuality?.fields.setbacks.status).toBe("defaulted");
    expect(data.dataQuality?.fields.zoning.status).toBe("unavailable");
    expect(data.dataQuality?.providerAttempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "Regrid", outcome: "no-match" }),
        expect.objectContaining({ provider: "ArcGIS", outcome: "matched" }),
      ]),
    );
  });

  it("fills a county GIS parcel's existing footprint from USA Structures", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(KING_LOT, { Shape__Area: 6000 }),
      structures: structuresResponse(1675),
    });

    const data = (await (await GET(makeRequest(47.65, -122.31))).json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.existingHouseSqft).toBe(1675);
  });

  it("serves county GIS geometry with no Regrid key configured", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    stubProviders({
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(KING_LOT, { Shape__Area: 6000 }),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.state).toBe("WA");
    expect(data.county).toBe("King");
  });

  it("prefers the Census county over the GIS layer's own spelling", async () => {
    // Statewide layers publish county names the market index cannot key on
    // ("NewYork", "DANE"). Letting one through silently downgrades the
    // financials to national averages, so the Census name has to win.
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: countyGisResponse(KING_LOT, {
        Shape__Area: 6000,
        COUNTY_NAME: "KingCounty",
      }),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.county).toBe("King");
  });

  it("keeps the GIS layer's county when the Census cannot supply one", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: { ok: false, status: 503 },
      countyGis: countyGisResponse(KING_LOT, { Shape__Area: 6000 }),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.county).toBe("King");
    expect(data.state).toBe("");
  });

  it("falls through to the preset when county GIS has no parcel either", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("WA", "King"),
      countyGis: EMPTY_FEATURES,
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("Unknown");
  });

  it("identifies preset dimensions and regulations as defaults", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      census: censusCoordinateResponse("CO", "Denver"),
      countyGis: EMPTY_FEATURES,
    });

    const data = (await (await GET(
      makeRequest(39.752, -104.999, "456 Pine St, Denver, CO 80202"),
    )).json()) as LiveParcelData & {
      dataQuality?: {
        fields: Record<string, { status: string }>;
        providerAttempts: Array<{ outcome: string }>;
      };
    };

    expect(data.source).toBe("fallback");
    expect(data.dataQuality?.fields.lotArea.status).toBe("defaulted");
    expect(data.existingHouseSqft).toBe(0);
    expect(data.dataQuality?.fields.existingHouseSqft.status).toBe("unavailable");
    expect(data.dataQuality?.fields.zoning.status).toBe("defaulted");
    expect(data.dataQuality?.fields.boundaryGeoJson.status).toBe("unavailable");
    expect(data.dataQuality?.providerAttempts).toEqual(
      expect.arrayContaining([expect.objectContaining({ outcome: "unsupported" })]),
    );
  });

  it("surfaces county assessor building area and zoning on the county-gis path and preserves them across statewide situs verification", async () => {
    const venturaLat = 34.2746;
    const venturaLng = -119.229;
    const venturaLot = rotatedRectPolygon(venturaLat, venturaLng, 60, 110, 0);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (url.includes("regrid.com")) {
          return { ok: true, status: 200, json: async () => ({ parcels: { features: [] } }) };
        }
        if (url.includes("geocoding.geo.census.gov")) {
          return censusAddressResponse("501 POLI ST, VENTURA, CA, 93001", "CA", "Ventura");
        }
        if (url.includes("maps.ventura.org")) {
          return countyGisResponse(venturaLot, {
            ACREAGE: "0.1515",
            SQ_FT_I: "1920",
            ZONE: "R2-1",
          });
        }
        if (url.includes("CA_Statewide_Parcels_Public_view")) {
          return countyGisResponse(venturaLot, {
            PARCEL_APN: "0710112050",
            SITE_ADDR: "501 POLI ST",
            SITE_CITY: "VENTURA",
            SITE_STATE: "CA",
            SITE_ZIP: "93001",
          });
        }
        return EMPTY_FEATURES;
      }),
    );

    const res = await GET(makeRequest(venturaLat, venturaLng, "501 Poli St, Ventura, CA 93001"));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("county-gis");
    expect(data.county).toBe("Ventura");
    expect(data.lotArea).toBe(6599);
    expect(data.existingHouseSqft).toBe(1920);
    expect(data.zoning).toBe("R2-1");
    expect(data.maxLotCoveragePercent).toBe(45);
    expect(data.dataQuality?.fields.lotArea.status).toBe("observed");
    expect(data.dataQuality?.fields.existingHouseSqft.status).toBe("observed");
    expect(data.dataQuality?.fields.zoning.status).toBe("observed");
    expect(data.dataQuality?.fields.maxLotCoveragePercent.status).toBe("derived");
    expect(data.regulationsEstimated).toBe(true);
    expect(data.marketData?.source).toBe("hud-county");
    expect(data.marketData?.rentByBedroom["1br"]).toBe(2250);
  });

  it("falls through to the preset when the GIS parcel has no usable area", async () => {
    stubProviders({
      regrid: {
        ok: true,
        status: 200,
        json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
      },
      countyGis: countyGisResponse(null, { Shape__Area: 6000 }),
    });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
  });
});

describe("GET /api/parcel — localized market data", () => {
  it("attaches market data resolved from the Regrid location fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25,
          zoning: "R-1",
          address: "123 Oak St",
          city: "Seattle",
          state2: "WA",
          szip5: "98107",
          county: "King County",
        }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.state).toBe("WA");
    expect(data.zip).toBe("98107");
    expect(data.county).toBe("King");
    expect(data.marketData?.source).toBe("hud-zip");
    expect(data.marketData?.rentByBedroom["1br"]).toBe(2050);
  });

  it("resolves fallback-parcel economics from the searched address, not the nearest preset", async () => {
    // A Los Angeles address whose parcel lookup fails must keep California
    // market economics — never inherit an Austin/Seattle preset's numbers.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    const res = await GET(
      makeRequest(34.05, -118.24, "789 Sunset Blvd, Los Angeles, CA 90026, USA"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("fallback");
    expect(data.state).toBe("CA");
    expect(data.marketData?.geography?.state).toBe("CA");
    // CA state-tier rent, not the Austin preset's Texas economics.
    expect(data.marketData?.rentByBedroom["1br"]).toBe(2150);
  });
});

describe("extractRegridLocation", () => {
  it("pulls structured state/zip/county from Regrid fields", () => {
    expect(
      extractRegridLocation({ state2: "WA", szip5: "98107", county: "King County" }),
    ).toEqual({ state: "WA", zip: "98107", county: "King" });
  });

  it("falls back across Regrid field aliases and strips the County suffix", () => {
    expect(
      extractRegridLocation({ state: "OR", zip: "97212", scounty: "Multnomah County" }),
    ).toEqual({ state: "OR", zip: "97212", county: "Multnomah" });
  });

  it("returns empty strings when fields are missing", () => {
    expect(extractRegridLocation({})).toEqual({ state: "", zip: "", county: undefined });
  });
});

describe("GET /api/parcel — anonymous callers", () => {
  it("never calls paid Regrid without a bearer token", async () => {
    // The free first lookup must not be able to bill, so a configured Regrid
    // key has to be unreachable on the anonymous path.
    vi.stubEnv("REGRID_API_KEY", "paid-key");
    const fetchMock = vi.fn().mockResolvedValue(regridResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeGuestRequest(47.65, -122.31));

    expect(res.status).toBe(200);
    const calledHosts = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledHosts.some((url) => url.includes("regrid.com"))).toBe(false);
  });

  it("still answers an anonymous lookup from the free chain", async () => {
    vi.stubEnv("REGRID_API_KEY", "paid-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(regridResponse({})));

    const res = await GET(makeGuestRequest(47.65, -122.31, "123 Oak St, Seattle, WA"));
    const data = (await res.json()) as LiveParcelData;

    // A guest gets a real answer, not a refusal: the whole point is that they
    // see their own lot before being asked for an account.
    expect(res.status).toBe(200);
    expect(data.source).not.toBe("regrid");
    expect(data.lotArea).toBeGreaterThan(0);
  });

  it("holds anonymous callers to the tighter guest rate limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(regridResponse({})));

    // The guest window allows 10/min; the 11th must be refused.
    for (let i = 0; i < 10; i += 1) {
      const ok = await GET(makeGuestRequest(47.65, -122.31));
      expect(ok.status).toBe(200);
    }
    const limited = await GET(makeGuestRequest(47.65, -122.31));

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET /api/parcel — zoning shadow classification", () => {
  const SHADOW_FIELDS = {
    ll_gisacre: 0.25,
    zoning: "NR3",
    zoning_description: "Neighborhood Residential 3",
    address: "123 Oak St",
    scity: "Seattle",
    city: "Kirkland",
    state: "WA",
    county: "King",
    zip: "98105",
  };

  const JEV_ANSWER = {
    ok: true,
    status: 200,
    json: async () => ({
      model: "jev-test",
      answers: {
        district: { type: "choice", choice: "single_family", confidence: 0.95 },
      },
    }),
  };

  function stubWithTypeSafe(
    typeSafe: unknown,
    fields: Record<string, unknown> = SHADOW_FIELDS,
  ) {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("api.typesafe.ai")) return typeSafe;
      if (url.includes("regrid.com")) return regridResponse(fields);
      return EMPTY_FEATURES;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function typeSafeCalls(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("api.typesafe.ai"),
    );
  }

  function shadowEvents(spy: ReturnType<typeof vi.spyOn>) {
    return spy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((line: string) => line.includes("jev_zoning_shadow"))
      .map((line: string) => JSON.parse(line));
  }

  let info: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearZoningCache();
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "true");
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("logs Jev's class and leaves the parcel response unchanged", async () => {
    const fetchMock = stubWithTypeSafe(JEV_ANSWER);

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.source).toBe("regrid");
    expect(data.zoning).toBe("NR3");
    // Unrecognized districts use an explicit planning default, never Jev output.
    expect(data.maxLotCoveragePercent).toBe(40);
    expect(data.dataQuality?.fields.maxLotCoveragePercent.status).toBe("defaulted");
    expect(data.regulationsEstimated).toBe(true);
    expect(typeSafeCalls(fetchMock)).toHaveLength(1);
    const events = shadowEvents(info);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      outcome: "classified",
      state: "WA",
      zoning: "NR3",
      zoningClass: "single_family",
      regexCoveragePercent: null,
    });
  });

  it("sends Jev the state, county, site city, designation and Regrid's description", async () => {
    const fetchMock = stubWithTypeSafe(JEV_ANSWER);

    await GET(makeRequest(47.65, -122.31));

    const body = JSON.parse(String(typeSafeCalls(fetchMock)[0][1]?.body));
    // The site city wins over the mailing city, as it does for the parcel's own city.
    expect(body.state).toEqual({
      parcel: {
        state: "WA",
        county: "King",
        city: "Seattle",
        zoningCode: "NR3",
        zoningDescription: "Neighborhood Residential 3",
      },
    });
  });

  it("falls back to the mailing city and omits a city Regrid does not supply", async () => {
    const withoutSiteCity: Record<string, unknown> = { ...SHADOW_FIELDS };
    delete withoutSiteCity.scity;
    const fetchMock = stubWithTypeSafe(JEV_ANSWER, withoutSiteCity);
    await GET(makeRequest(47.65, -122.31));
    expect(
      JSON.parse(String(typeSafeCalls(fetchMock)[0][1]?.body)).state.parcel.city,
    ).toBe("Kirkland");

    clearZoningCache();
    const withoutAnyCity: Record<string, unknown> = { ...SHADOW_FIELDS };
    delete withoutAnyCity.scity;
    delete withoutAnyCity.city;
    const noCityFetch = stubWithTypeSafe(JEV_ANSWER, withoutAnyCity);
    await GET(makeRequest(47.65, -122.31));
    expect(
      JSON.parse(String(typeSafeCalls(noCityFetch)[0][1]?.body)).state.parcel,
    ).not.toHaveProperty("city");
  });

  it("does not call TypeSafe when the flag is off", async () => {
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "");
    const fetchMock = stubWithTypeSafe(JEV_ANSWER);

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.zoning).toBe("NR3");
    expect(typeSafeCalls(fetchMock)).toHaveLength(0);
    expect(shadowEvents(info)).toHaveLength(0);
  });

  it("still returns the parcel when TypeSafe fails", async () => {
    stubWithTypeSafe({ ok: false, status: 503 });

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.source).toBe("regrid");
    expect(data.maxLotCoveragePercent).toBe(40);
    expect(shadowEvents(warn)[0]).toMatchObject({
      severity: "WARNING",
      outcome: "fallback-provider-error",
    });
  });

  it("does not classify a Regrid record that has no zoning", async () => {
    const withoutZoning: Record<string, unknown> = { ...SHADOW_FIELDS };
    delete withoutZoning.zoning;
    const fetchMock = stubWithTypeSafe(JEV_ANSWER, withoutZoning);

    const res = await GET(makeRequest(47.65, -122.31));

    expect(res.status).toBe(200);
    expect(typeSafeCalls(fetchMock)).toHaveLength(0);
  });

  it("downgrades Regrid identity confidence and emits a situs warning when Regrid saddress conflicts with the searched street address", async () => {
    vi.stubEnv("TYPESAFE_ZONING_SHADOW", "");
    stubWithTypeSafe(JEV_ANSWER, {
      ...SHADOW_FIELDS,
      saddress: "999 Different Ave",
      scity: "Seattle",
      state2: "WA",
      szip5: "98105",
    });

    const res = await GET(
      makeRequest(47.65, -122.31, "1234 NE 50th St, Seattle, WA 98105"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(res.status).toBe(200);
    expect(data.source).toBe("regrid");
    expect(data.dataQuality?.fields.address.confidence).toBe("low");
    expect(data.dataQuality?.fields.lotArea.confidence).toBe("low");
    expect(data.dataQuality?.warnings.join(" ")).toContain(
      "situs street address (999 Different Ave) differs",
    );
  });
});

