import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { polygonContainsPoint } from "@/lib/parcel-geometry";
import type { LiveParcelData } from "@/lib/parcel-types";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import { GET } from "./route";

/**
 * Signed-in / guest coordinate drift for one public address, and the guard that
 * a point's parcel must actually publish the searched street address.
 *
 * The audit's guest point falls on a King County parcel that is officially
 * published as 1245B NE 88th St (PIN 6401670000), not the searched 1421; the
 * signed-in point falls on no parcel. So a polygon merely containing the point
 * proves nothing about the address. Geometry here is synthetic but keeps that
 * shape: the guest point is on a lot published as 1245B, the phone point is on
 * no lot, and the searched address belongs to a lot a short way east. Nothing
 * here asserts that any real address resolves to any real parcel.
 *
 * King County has two layers: a geometry-only one queried by point, and an
 * address-enriched one queried for the official situs address and PIN.
 */

const GUEST_POINT = { lat: 47.6920824, lng: -122.3129897 };
const PHONE_POINT = { lat: 47.69217, lng: -122.31232 };
const FT_PER_DEG_LAT = 364000;
/** Google-style label a signed-in client sends. */
const GOOGLE_ADDRESS = "1421 NE 88th St, Seattle, WA 98115, USA";
/** Nominatim-style label (spelled-out directional and suffix) a guest client sends. */
const NOMINATIM_ADDRESS = "1421 Northeast 88th Street, Seattle, WA 98115";
const ALLOWLIST = "PIN,ADDR_FULL,CTYNAME,POSTALCTYNAME,ZIP5,STATE_ABBR,Shape__Area";

function lot(lat: number, lng: number, widthFt: number, lengthFt: number) {
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const corners: Array<[number, number]> = [
    [-widthFt / 2, -lengthFt / 2],
    [widthFt / 2, -lengthFt / 2],
    [widthFt / 2, lengthFt / 2],
    [-widthFt / 2, lengthFt / 2],
  ];
  const ring = corners.map(([x, y]) => [lng + x / lngScale, lat + y / FT_PER_DEG_LAT]);
  ring.push(ring[0]);
  return { type: "Polygon" as const, coordinates: [ring] };
}

/** Contains the guest point; officially published as 1245B, not 1421. */
const POINT_LOT = lot(GUEST_POINT.lat, GUEST_POINT.lng, 50, 103);
/** The lot the searched address belongs to: ~245 ft east of the guest point. */
const TARGET_LOT = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.001, 50, 103);
/** Next door to the target, ~61 ft east: shares its search window, does not overlap. */
const NEIGHBOR_LOT = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.00125, 50, 103);
const TARGET_POINT = { lat: GUEST_POINT.lat, lng: GUEST_POINT.lng + 0.001 };

const LOCALITY = {
  CTYNAME: "SEATTLE",
  POSTALCTYNAME: "SEATTLE",
  ZIP5: "98115",
  STATE_ABBR: "WA",
};
const TARGET_SITUS = {
  PIN: "8562901005",
  ADDR_FULL: "1421 NE 88TH ST",
  ...LOCALITY,
  // The address layer publishes the official lot area alongside the address.
  Shape__Area: 5160.4,
};
const AUDIT_POINT_SITUS = { PIN: "6401670000", ADDR_FULL: "1245B NE 88TH ST", ...LOCALITY };

function feature(geometry: unknown, properties: Record<string, unknown>) {
  return { type: "Feature", geometry, properties };
}

function featuresResponse(features: unknown[], extra: Record<string, unknown> = {}) {
  return { ok: true, status: 200, json: async () => ({ features, ...extra }) };
}

/** What the geometry-only layer returns for a point on `polygon`. */
function geometryHit(polygon: unknown, area = 5160) {
  return featuresResponse([feature(polygon, { Shape__Area: area })]);
}

/** Address-layer records include their own official geometry. */
function situsRecords(...records: Array<Record<string, unknown>>) {
  return featuresResponse(records.map((record) => feature(
    record.PIN === TARGET_SITUS.PIN ? TARGET_LOT : POINT_LOT, record,
  )));
}

/** Twelve unrelated parcels, like the audit's crowded window: none is the searched address. */
const CROWD = Array.from({ length: 12 }, (_, index) =>
  feature(lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.0004 * index, 50, 103), {
    ...LOCALITY,
    PIN: `99000000${index}`,
    ADDR_FULL: `${1101 + index * 2} NE 88TH ST`,
  }),
);

const NO_FEATURES = featuresResponse([]);
const UNAVAILABLE = { ok: false, status: 503, json: async () => ({}) };
const NO_REGRID_PARCEL = {
  ok: true,
  status: 200,
  json: async () => ({ parcels: { type: "FeatureCollection", features: [] } }),
};
const SEATTLE_CENSUS = {
  ok: true,
  status: 200,
  json: async () => ({
    result: {
      addressMatches: [
        {
          matchedAddress: "1421 NE 88TH ST, SEATTLE, WA, 98115",
          geographies: {
            States: [{ STUSAB: "WA" }],
            Counties: [{ BASENAME: "King" }],
          },
        },
      ],
    },
  }),
};

interface Script {
  regrid?: unknown;
  census?: unknown;
  /** King geometry-only layer, queried by the searched point. */
  kingPoint?: unknown;
  /** Washington statewide backstop, queried by point. */
  waPoint?: unknown;
  /** King address-enriched layer, queried by the searched point. */
  situsPoint?: unknown;
  /** King address-enriched layer, queried for the search window. */
  situsWindow?: unknown;
  /** Multnomah geometry layer, queried by point. */
  multnomahPoint?: unknown;
}

function respond(url: string, script: Script): unknown {
  if (url.includes("regrid.com")) return script.regrid ?? NO_REGRID_PARCEL;
  if (url.includes("geocoding.geo.census.gov")) return script.census ?? SEATTLE_CENSUS;
  if (url.includes("USA_Structures_View")) return NO_FEATURES;
  if (url.includes("PARCEL_ADDRESS_PUB_AREA_3069")) {
    const byWindow = url.includes("esriGeometryEnvelope");
    return (byWindow ? script.situsWindow : script.situsPoint) ?? NO_FEATURES;
  }
  if (url.includes("PARCEL_AREA_439")) return script.kingPoint ?? NO_FEATURES;
  if (url.includes("Current_Parcels")) return script.waPoint ?? NO_FEATURES;
  if (url.includes("portlandmaps.com")) return script.multnomahPoint ?? NO_FEATURES;
  return NO_FEATURES;
}

/** A provider that never answers; the caller's own abort timer ends the request. */
const HANG = Symbol("hang");

function stubProviders(script: Script = {}) {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const response = respond(String(input), script);
    if (response instanceof Error) throw response;
    if (response === HANG) {
      return await new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function urlsOf(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

/** Requests to King's address-enriched layer. */
function situsCalls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return urlsOf(fetchMock).filter((url) => url.includes("PARCEL_ADDRESS_PUB_AREA_3069"));
}

function situsPointCalls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return situsCalls(fetchMock).filter((url) => url.includes("esriGeometryPoint"));
}

function situsWindowCalls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return situsCalls(fetchMock).filter((url) => url.includes("esriGeometryEnvelope"));
}

function parcelRequest(
  point: { lat: number; lng: number },
  address: string | undefined,
  signedIn: boolean,
): NextRequest {
  const url = new URL("http://localhost/api/parcel");
  url.searchParams.set("lat", String(point.lat));
  url.searchParams.set("lng", String(point.lng));
  if (address) url.searchParams.set("address", address);
  return new NextRequest(
    url,
    signedIn ? { headers: { authorization: "Bearer test-token" } } : undefined,
  );
}

async function lookup(
  point: { lat: number; lng: number },
  address: string | undefined,
  signedIn: boolean,
) {
  const res = await GET(parcelRequest(point, address, signedIn));
  return { res, data: (await res.json()) as LiveParcelData };
}

/** `dataset:outcome` for ArcGIS attempts, `provider:outcome` otherwise, in order. */
function attemptSummary(data: LiveParcelData): string[] {
  return (data.dataQuality?.providerAttempts ?? []).map(
    (attempt) =>
      `${attempt.provider === "ArcGIS" ? attempt.dataset : attempt.provider}:${attempt.outcome}`,
  );
}

const CONFLICT_TEXT = "published under a different street address";
const UNRESOLVED_TEXT = "could not be matched to a single official parcel record";

/** The response must not present any parcel as the searched property. */
function expectRefusedFallback(
  data: LiveParcelData,
  point: { lat: number; lng: number },
  issue: "conflict" | "unresolved",
) {
  expect(data.source).toBe("fallback");
  expect(data.boundaryGeoJson).toBeNull();
  expect(data.zoning).toBe("Unknown");
  expect(data.existingHouseSqft).toBe(0);
  expect(data.dataQuality!.fields.existingHouseSqft.status).toBe("unavailable");
  // No coordinate shift without a verified match.
  expect(data.lat).toBe(point.lat);
  expect(data.lng).toBe(point.lng);
  const quality = data.dataQuality!;
  expect(quality.fields.boundaryGeoJson.status).toBe("unavailable");
  // Nothing is marked observed, and no official parcel identifier is attached.
  for (const field of Object.values(quality.fields)) {
    expect(field.status).not.toBe("observed");
    expect(field.source.recordId).toBeUndefined();
  }
  // The unresolved/conflict outcome is carried as evidence on the address itself.
  expect(quality.fields.address.confidence).toBe("low");
  const text = issue === "conflict" ? CONFLICT_TEXT : UNRESOLVED_TEXT;
  expect(quality.fields.address.warnings.join(" ")).toContain(text);
  expect(quality.fields.boundaryGeoJson.warnings.join(" ")).toContain(text);
  expect(quality.warnings.join(" ")).toContain(text);
}

interface Caller {
  name: string;
  signedIn: boolean;
  address: string;
  /** Attempts every lookup by this caller starts with. */
  prefix: string[];
}

const CALLERS: Caller[] = [
  { name: "signed-in member", signedIn: true, address: GOOGLE_ADDRESS, prefix: ["Regrid:no-match"] },
  { name: "guest", signedIn: false, address: NOMINATIM_ADDRESS, prefix: [] },
];

beforeEach(() => {
  vi.restoreAllMocks();
  resetRateLimitBuckets();
  vi.stubEnv("REGRID_API_KEY", "test-token");
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "paid-maps-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/parcel — official street-address verification", () => {
  it("uses the verified situs feature's own polygon, not a larger overlapping geometry-layer lot", async () => {
    const otherLot = lot(TARGET_POINT.lat, TARGET_POINT.lng, 100, 150);
    stubProviders({
      kingPoint: geometryHit(otherLot, 15000),
      situsPoint: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
    });
    const { data } = await lookup(TARGET_POINT, GOOGLE_ADDRESS, false);
    expect(data.boundaryGeoJson).toEqual(TARGET_LOT);
    expect(data.lotArea).toBe(5160);
    expect(data.dataQuality!.fields.boundaryGeoJson.source).toMatchObject({
      dataset: "King parcel addresses", recordId: TARGET_SITUS.PIN,
    });
  });

  it("does not attach a verified PIN to unrelated geometry when situs geometry is missing", async () => {
    stubProviders({
      kingPoint: geometryHit(TARGET_LOT),
      situsPoint: featuresResponse([feature(null, TARGET_SITUS)]),
    });
    const { data } = await lookup(TARGET_POINT, GOOGLE_ADDRESS, false);
    expect(data.dataQuality!.fields.boundaryGeoJson.confidence).toBe("medium");
    expect(data.dataQuality!.fields.boundaryGeoJson.source.recordId).toBeUndefined();
    expect(data.dataQuality!.fields.address.confidence).not.toBe("high");
  });

  it("refuses a successful Regrid hit when the official address layer contradicts it", async () => {
    stubProviders({
      regrid: { ok: true, status: 200, json: async () => ({ parcels: { features: [{
        geometry: POINT_LOT,
        properties: { fields: { ll_gisacre: 0.5, saddress: "1421 NE 88th St", scity: "Seattle" } },
      }] } }) },
      kingPoint: geometryHit(POINT_LOT, 5155),
      situsPoint: situsRecords(AUDIT_POINT_SITUS),
      situsWindow: featuresResponse([feature(POINT_LOT, AUDIT_POINT_SITUS)]),
    });
    const { data } = await lookup(GUEST_POINT, GOOGLE_ADDRESS, true);
    expectRefusedFallback(data, GUEST_POINT, "conflict");
  });

  it("uses the official feature for a successful paid hit instead of attaching its PIN to Regrid geometry", async () => {
    stubProviders({
      regrid: { ok: true, status: 200, json: async () => ({ parcels: { features: [{
        geometry: lot(TARGET_POINT.lat, TARGET_POINT.lng, 100, 150),
        properties: { fields: { ll_gisacre: 0.5, saddress: "1421 NE 88th St" } },
      }] } }) },
      situsPoint: situsRecords(TARGET_SITUS),
    });
    const { data } = await lookup(TARGET_POINT, GOOGLE_ADDRESS, true);
    expect(data.source).toBe("county-gis");
    expect(data.boundaryGeoJson).toEqual(TARGET_LOT);
    expect(data.lotArea).toBe(5160);
    expect(data.dataQuality!.fields.boundaryGeoJson.source.recordId).toBe(TARGET_SITUS.PIN);
  });

  it("preserves a usable paid record at reduced confidence when official identity cannot be checked", async () => {
    stubProviders({
      regrid: { ok: true, status: 200, json: async () => ({ parcels: { features: [{
        geometry: TARGET_LOT,
        properties: { fields: { ll_gisacre: 0.5, saddress: "1421 NE 88th St" } },
      }] } }) },
      situsPoint: UNAVAILABLE,
    });
    const { data } = await lookup(TARGET_POINT, GOOGLE_ADDRESS, true);
    expect(data.source).toBe("regrid");
    expect(data.dataQuality!.fields.boundaryGeoJson.confidence).toBe("medium");
    expect(data.dataQuality!.fields.address.confidence).toBe("medium");
    expect(data.dataQuality!.warnings.join(" ")).toContain("could not confirm");
  });

  describe.each(CALLERS)("$name", ({ signedIn, address, prefix }) => {
    it("verifies a point-hit parcel against its official address and records the PIN", async () => {
      const fetchMock = stubProviders({
        kingPoint: geometryHit(TARGET_LOT),
        situsPoint: situsRecords(TARGET_SITUS),
      });

      const { res, data } = await lookup(TARGET_POINT, address, signedIn);

      expect(res.status).toBe(200);
      expect(data.source).toBe("county-gis");
      expect(data.lotArea).toBe(5160);
      // A verified point hit is not moved.
      expect(data.lat).toBe(TARGET_POINT.lat);
      expect(data.lng).toBe(TARGET_POINT.lng);
      expect(attemptSummary(data)).toEqual([
        ...prefix,
        "King parcels:matched",
        "King parcel addresses:matched",
      ]);
      const fields = data.dataQuality!.fields;
      // The boundary and PIN are both credited to the same official situs feature.
      expect(fields.boundaryGeoJson).toMatchObject({
        status: "observed",
        confidence: "high",
        source: { provider: "ArcGIS", dataset: "King parcel addresses", recordId: "8562901005" },
      });
      expect(fields.lotArea).toMatchObject({ status: "observed", confidence: "high" });
      // The address is derived from the searched text but now checked against an official record.
      expect(fields.address).toMatchObject({
        status: "derived",
        confidence: "high",
        source: { provider: "ArcGIS", dataset: "King parcel addresses", recordId: "8562901005" },
      });
      expect(data.dataQuality!.warnings.join(" ")).not.toContain("moved");
      expect(situsPointCalls(fetchMock)).toHaveLength(1);
      expect(situsWindowCalls(fetchMock)).toHaveLength(0);
    });

    it("refuses the audit's point parcel when it is officially another address", async () => {
      // The guest point falls on PIN 6401670000, published as 1245B. The 5,155 sf
      // polygon under the point is therefore NOT the searched property.
      const fetchMock = stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsPoint: situsRecords(AUDIT_POINT_SITUS),
        situsWindow: featuresResponse([feature(POINT_LOT, AUDIT_POINT_SITUS), ...CROWD]),
      });

      const { res, data } = await lookup(GUEST_POINT, address, signedIn);

      expect(res.status).toBe(200);
      expectRefusedFallback(data, GUEST_POINT, "conflict");
      expect(data.lotArea).not.toBe(5155);
      expect(attemptSummary(data)).toEqual([
        ...prefix,
        "King parcels:matched",
        "King parcel addresses:no-match",
        "King parcel addresses:no-match",
      ]);
      // The contradiction is on the record: which parcel the point fell on, and why it was refused.
      expect(data.dataQuality!.providerAttempts).toContainEqual(
        expect.objectContaining({
          dataset: "King parcel addresses",
          outcome: "no-match",
          detail: expect.stringContaining("6401670000"),
        }),
      );
      // One point check, one bounded window: nothing else was asked of the address layer.
      expect(situsPointCalls(fetchMock)).toHaveLength(1);
      expect(situsWindowCalls(fetchMock)).toHaveLength(1);
    });

    it("looks the address up when its point's parcel is another address, and matches the real one", async () => {
      const fetchMock = stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsPoint: situsRecords(AUDIT_POINT_SITUS),
        situsWindow: featuresResponse([
          feature(POINT_LOT, AUDIT_POINT_SITUS),
          feature(TARGET_LOT, TARGET_SITUS),
          feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: "8562901010", ADDR_FULL: "1425 NE 88TH ST" }),
        ]),
      });

      const { data } = await lookup(GUEST_POINT, address, signedIn);

      expect(data.source).toBe("county-gis");
      // The searched address's own parcel, not the 5,155 sf one under the point.
      expect(data.lotArea).toBe(5160);
      expect(polygonContainsPoint(data.boundaryGeoJson!, data.lng, data.lat)).toBe(true);
      expect(polygonContainsPoint(TARGET_LOT, data.lng, data.lat)).toBe(true);
      expect(polygonContainsPoint(POINT_LOT, data.lng, data.lat)).toBe(false);
      expect(attemptSummary(data)).toEqual([
        ...prefix,
        "King parcels:matched",
        "King parcel addresses:no-match",
        "King parcel addresses:matched",
      ]);
      const fields = data.dataQuality!.fields;
      expect(fields.boundaryGeoJson).toMatchObject({
        status: "observed",
        confidence: "medium",
        source: { provider: "ArcGIS", dataset: "King parcel addresses", recordId: "8562901005" },
      });
      // The move is disclosed on the boundary, the address, and the response.
      expect(fields.boundaryGeoJson.warnings.join(" ")).toContain("moved inside it");
      expect(fields.address.warnings.join(" ")).toContain("moved inside it");
      expect(data.dataQuality!.warnings.join(" ")).toContain("moved inside it");
      expect(fields.address).toMatchObject({
        confidence: "high",
        source: { dataset: "King parcel addresses", recordId: "8562901005" },
      });
      expect(situsWindowCalls(fetchMock)).toHaveLength(1);
    });

    it("matches a point that falls on no parcel to the parcel that publishes the address", async () => {
      const fetchMock = stubProviders({
        situsWindow: featuresResponse([
          feature(POINT_LOT, AUDIT_POINT_SITUS),
          feature(TARGET_LOT, TARGET_SITUS),
        ]),
      });

      const { res, data } = await lookup(PHONE_POINT, address, signedIn);

      expect(res.status).toBe(200);
      expect(data.source).toBe("county-gis");
      // The same official area a verified point hit reports for this parcel.
      expect(data.lotArea).toBe(5160);
      expect(data.lotWidth).toBeGreaterThanOrEqual(49);
      expect(data.lotWidth).toBeLessThanOrEqual(51);
      expect(data.lotLength).toBeGreaterThanOrEqual(102);
      expect(data.lotLength).toBeLessThanOrEqual(104);
      // The display address stays the caller's own label, not the official string.
      expect(data.address).toBe(address.split(",")[0]);
      expect(data.state).toBe("WA");
      expect(data.county).toBe("King");
      expect(polygonContainsPoint(data.boundaryGeoJson!, data.lng, data.lat)).toBe(true);
      expect(data.lat).not.toBe(PHONE_POINT.lat);
      expect(attemptSummary(data)).toEqual([
        ...prefix,
        "King parcels:no-match",
        "Washington (statewide) parcels:no-match",
        "King parcel addresses:matched",
      ]);
      expect(data.dataQuality!.fields.boundaryGeoJson).toMatchObject({
        confidence: "medium",
        source: { recordId: "8562901005" },
      });
      // No parcel at the point, so there was nothing to verify at the point.
      expect(situsPointCalls(fetchMock)).toHaveLength(0);
      expect(situsWindowCalls(fetchMock)).toHaveLength(1);
      // Address-specific, so never shareable between callers.
      expect(res.headers.get("Cache-Control")).toBe("private, max-age=3600");
    });

    it("same parcel, several features: a multipart parcel is matched once, by its largest part", async () => {
      const island = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.0016, 20, 30);
      stubProviders({
        situsWindow: featuresResponse([
          feature(TARGET_LOT, TARGET_SITUS),
          feature(island, TARGET_SITUS),
        ]),
      });

      const { data } = await lookup(PHONE_POINT, address, signedIn);

      expect(data.source).toBe("county-gis");
      // The published area covers every part; the largest part's own area is reported.
      expect(data.lotArea).not.toBe(5160);
      expect(data.lotArea).toBeGreaterThan(5100);
      expect(data.lotArea).toBeLessThan(5200);
      expect(polygonContainsPoint(TARGET_LOT, data.lng, data.lat)).toBe(true);
      expect(data.dataQuality!.fields.boundaryGeoJson.source.recordId).toBe("8562901005");
    });

    describe("timeouts", () => {
      it("a hung address check leaves the point's parcel served as unverified", async () => {
        vi.useFakeTimers();
        stubProviders({ kingPoint: geometryHit(TARGET_LOT), situsPoint: HANG });

        const pending = lookup(TARGET_POINT, address, signedIn);
        await vi.advanceTimersByTimeAsync(4100);
        const { res, data } = await pending;

        expect(res.status).toBe(200);
        expect(data.source).toBe("county-gis");
        expect(data.dataQuality!.fields.boundaryGeoJson.confidence).toBe("medium");
        expect(data.dataQuality!.fields.boundaryGeoJson.warnings.join(" ")).toContain(
          "could not confirm",
        );
        expect(attemptSummary(data).slice(-1)).toEqual(["King parcel addresses:timeout"]);
      });

      it("a hung address lookup after a contradiction is refused, not served", async () => {
        vi.useFakeTimers();
        stubProviders({
          kingPoint: geometryHit(POINT_LOT, 5155),
          situsPoint: situsRecords(AUDIT_POINT_SITUS),
          situsWindow: HANG,
        });

        const pending = lookup(GUEST_POINT, address, signedIn);
        await vi.advanceTimersByTimeAsync(4100);
        const { res, data } = await pending;

        expect(res.status).toBe(200);
        expectRefusedFallback(data, GUEST_POINT, "conflict");
        expect(attemptSummary(data).slice(-1)).toEqual(["King parcel addresses:timeout"]);
      });
    });

    it("never requests anything but the allowlisted attributes from the address layer", async () => {
      const fetchMock = stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsPoint: situsRecords(AUDIT_POINT_SITUS),
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      await lookup(GUEST_POINT, address, signedIn);

      const calls = situsCalls(fetchMock);
      expect(calls).toHaveLength(2);
      for (const url of calls) {
        const outFields = new URL(url).searchParams.get("outFields");
        expect(outFields).toBe(ALLOWLIST);
        expect(outFields).not.toContain("*");
      }
      // Point and window both need the geometry that belongs to the published PIN.
      expect(new URL(situsPointCalls(fetchMock)[0]).searchParams.get("returnGeometry")).toBe("true");
    });

    it("never logs or echoes the searched street address", async () => {
      const spies = [
        vi.spyOn(console, "log").mockImplementation(() => {}),
        vi.spyOn(console, "info").mockImplementation(() => {}),
        vi.spyOn(console, "warn").mockImplementation(() => {}),
        vi.spyOn(console, "error").mockImplementation(() => {}),
        vi.spyOn(console, "debug").mockImplementation(() => {}),
      ];
      stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsPoint: situsRecords(AUDIT_POINT_SITUS),
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      const { data } = await lookup(GUEST_POINT, address, signedIn);

      expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toMatch(/1421|1245|88th/i);
      expect(JSON.stringify(data.dataQuality!.providerAttempts)).not.toMatch(/1421 |1245|88th/i);
    });

    describe("refusals", () => {
      it.each([
        ["wrong street", { ADDR_FULL: "1421 NW 88TH ST" }],
        ["wrong house number", { ADDR_FULL: "1425 NE 88TH ST" }],
        ["wrong city", { CTYNAME: "SHORELINE", POSTALCTYNAME: "SHORELINE" }],
        ["wrong ZIP", { ZIP5: "98125" }],
        ["wrong state", { STATE_ABBR: "OR" }],
      ])("%s: a parcel published that way is not used", async (_label, override) => {
        stubProviders({
          situsWindow: featuresResponse([feature(TARGET_LOT, { ...TARGET_SITUS, ...override })]),
        });

        const { res, data } = await lookup(PHONE_POINT, address, signedIn);

        expect(res.status).toBe(200);
        expectRefusedFallback(data, PHONE_POINT, "unresolved");
        expect(attemptSummary(data)).toEqual([
          ...prefix,
          "King parcels:no-match",
          "Washington (statewide) parcels:no-match",
          "King parcel addresses:no-match",
        ]);
      });

      it("reports a wrong city as a conflict in the attempt detail", async () => {
        stubProviders({
          situsWindow: featuresResponse([
            feature(TARGET_LOT, { ...TARGET_SITUS, CTYNAME: "SHORELINE", POSTALCTYNAME: "SHORELINE" }),
          ]),
        });

        const { data } = await lookup(PHONE_POINT, address, signedIn);

        expect(data.dataQuality!.providerAttempts).toContainEqual(
          expect.objectContaining({
            outcome: "no-match",
            detail: expect.stringContaining("different city, ZIP or state"),
          }),
        );
      });

      it("ambiguity: two parcels publishing the address are refused, not ranked", async () => {
        stubProviders({
          situsWindow: featuresResponse([
            feature(TARGET_LOT, TARGET_SITUS),
            feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: "8562901010" }),
          ]),
        });

        const { data } = await lookup(PHONE_POINT, address, signedIn);

        expectRefusedFallback(data, PHONE_POINT, "unresolved");
        expect(data.dataQuality!.providerAttempts).toContainEqual(
          expect.objectContaining({
            outcome: "invalid-response",
            detail: expect.stringContaining("Multiple distinct parcels"),
          }),
        );
      });

      it("ambiguity at the point: two parcels publishing the address withhold the point's parcel", async () => {
        stubProviders({
          kingPoint: geometryHit(TARGET_LOT),
          situsPoint: situsRecords(TARGET_SITUS, { ...TARGET_SITUS, PIN: "8562901010" }),
          situsWindow: featuresResponse([
            feature(TARGET_LOT, TARGET_SITUS),
            feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: "8562901010" }),
          ]),
        });

        const { data } = await lookup(TARGET_POINT, address, signedIn);

        expectRefusedFallback(data, TARGET_POINT, "conflict");
      });

      it("no identity: parcels without an official identifier are never matched", async () => {
        const { PIN: _pin, ...withoutPin } = TARGET_SITUS;
        void _pin;
        stubProviders({
          situsWindow: featuresResponse([feature(TARGET_LOT, withoutPin)]),
        });

        const { data } = await lookup(PHONE_POINT, address, signedIn);

        expectRefusedFallback(data, PHONE_POINT, "unresolved");
        expect(data.dataQuality!.providerAttempts).toContainEqual(
          expect.objectContaining({
            dataset: "King parcel addresses",
            outcome: "invalid-response",
          }),
        );
      });

      it("provider unavailable: an HTTP error on the address window is an attempt, not a crash", async () => {
        stubProviders({ situsWindow: UNAVAILABLE });

        const { res, data } = await lookup(PHONE_POINT, address, signedIn);

        expect(res.status).toBe(200);
        expectRefusedFallback(data, PHONE_POINT, "unresolved");
        expect(data.dataQuality!.providerAttempts).toContainEqual(
          expect.objectContaining({
            dataset: "King parcel addresses",
            outcome: "provider-error",
            detail: "HTTP 503",
          }),
        );
      });

      it("provider unreachable: a network failure on the address window is an attempt, not a crash", async () => {
        stubProviders({ situsWindow: new TypeError("Network error") });

        const { res, data } = await lookup(PHONE_POINT, address, signedIn);

        expect(res.status).toBe(200);
        expectRefusedFallback(data, PHONE_POINT, "unresolved");
        expect(attemptSummary(data).slice(-1)).toEqual(["King parcel addresses:provider-error"]);
      });

      it("a contradicted point whose lookup is unavailable is still refused, not served", async () => {
        stubProviders({
          kingPoint: geometryHit(POINT_LOT, 5155),
          situsPoint: situsRecords(AUDIT_POINT_SITUS),
          situsWindow: UNAVAILABLE,
        });

        const { data } = await lookup(GUEST_POINT, address, signedIn);

        expectRefusedFallback(data, GUEST_POINT, "conflict");
        expect(data.lotArea).not.toBe(5155);
      });
    });

    describe("point hit the address layer cannot vouch for", () => {
      it.each([
        ["an HTTP error", UNAVAILABLE],
        ["a network failure", new TypeError("Network error")],
        ["no parcel at the point", NO_FEATURES],
        ["a parcel without an official identifier", (() => {
          const { PIN: _pin, ...withoutPin } = TARGET_SITUS;
          void _pin;
          return situsRecords(withoutPin);
        })()],
      ])("%s: served as unverified, at lower confidence, with a warning", async (_label, situsPoint) => {
        const fetchMock = stubProviders({ kingPoint: geometryHit(TARGET_LOT), situsPoint });

        const { res, data } = await lookup(TARGET_POINT, address, signedIn);

        expect(res.status).toBe(200);
        // Nothing contradicted the parcel, so it is served; nothing verified it either.
        expect(data.source).toBe("county-gis");
        expect(data.lotArea).toBe(5160);
        expect(data.lat).toBe(TARGET_POINT.lat);
        const fields = data.dataQuality!.fields;
        expect(fields.boundaryGeoJson.confidence).toBe("medium");
        expect(fields.lotArea.confidence).toBe("medium");
        expect(fields.boundaryGeoJson.source.recordId).toBeUndefined();
        expect(fields.address).toMatchObject({ status: "derived", confidence: "medium" });
        expect(fields.address.source.dataset).toBe("User-supplied address");
        expect(fields.boundaryGeoJson.warnings.join(" ")).toContain("could not confirm");
        expect(data.dataQuality!.warnings.join(" ")).toContain("could not confirm");
        // An unanswered check is not a contradiction: no lookup is attempted.
        expect(situsWindowCalls(fetchMock)).toHaveLength(0);
      });
    });
  });

  describe("guests stay on the free chain", () => {
    it("reconciles and verifies without touching paid providers", async () => {
      vi.stubEnv("REGRID_API_KEY", "paid-key");
      const fetchMock = stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsPoint: situsRecords(AUDIT_POINT_SITUS),
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      const { data } = await lookup(GUEST_POINT, NOMINATIM_ADDRESS, false);

      expect(data.source).toBe("county-gis");
      const urls = urlsOf(fetchMock);
      expect(urls.some((url) => url.includes("regrid.com"))).toBe(false);
      expect(urls.some((url) => url.includes("maps.googleapis.com"))).toBe(false);
    });
  });

  describe("where no address layer is registered, parcel identity remains unverified", () => {
    it("serves a point hit at reduced confidence when no address check is available (Portland)", async () => {
      const fetchMock = stubProviders({
        multnomahPoint: featuresResponse([
          feature(lot(45.5138, -122.6293, 50, 100), { A_T_SQFT: 5000 }),
        ]),
      });

      const { data } = await lookup(
        { lat: 45.5138, lng: -122.6293 },
        "456 NE 20th Ave, Portland, OR 97232, USA",
        false,
      );

      expect(data.source).toBe("county-gis");
      expect(data.lotArea).toBe(5000);
      expect(data.dataQuality!.fields.boundaryGeoJson).toMatchObject({
        confidence: "medium",
        source: { provider: "ArcGIS", dataset: "Multnomah parcels" },
      });
      expect(data.dataQuality!.fields.boundaryGeoJson.source.recordId).toBeUndefined();
      expect(data.dataQuality!.fields.address.source.dataset).toBe("User-supplied address");
      expect(data.dataQuality!.providerAttempts.map((attempt) => attempt.dataset)).toEqual([
        "Multnomah parcels",
      ]);
      expect(situsCalls(fetchMock)).toHaveLength(0);
    });

    it("does not invent address data for a statewide-only area (Spokane)", async () => {
      const fetchMock = stubProviders({
        waPoint: featuresResponse([
          feature(lot(47.66, -117.42, 50, 100), {}),
        ]),
      });

      const { data } = await lookup(
        { lat: 47.66, lng: -117.42 },
        "100 W Main Ave, Spokane, WA 99201, USA",
        false,
      );

      expect(data.source).toBe("county-gis");
      expect(data.dataQuality!.fields.boundaryGeoJson.confidence).toBe("medium");
      expect(data.dataQuality!.fields.boundaryGeoJson.source.recordId).toBeUndefined();
      expect(situsCalls(fetchMock)).toHaveLength(0);
    });

    it("does not reconcile a point miss where no address layer is registered (Denver)", async () => {
      const fetchMock = stubProviders({});

      const { data } = await lookup(
        { lat: 39.752, lng: -104.999 },
        "456 Pine St, Denver, CO 80202, USA",
        true,
      );

      expect(data.source).toBe("fallback");
      expect(situsCalls(fetchMock)).toHaveLength(0);
      // No check ran, so the response does not claim a failed one.
      expect(data.dataQuality!.warnings.join(" ")).not.toContain(UNRESOLVED_TEXT);
      expect(data.dataQuality!.fields.address.confidence).toBe("medium");
    });
  });

  describe("when no address check is made", () => {
    it("skips it for a coordinate-only lookup", async () => {
      const fetchMock = stubProviders({
        kingPoint: geometryHit(POINT_LOT, 5155),
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      const { data } = await lookup(GUEST_POINT, undefined, true);

      // Exactly the pre-existing behavior: the point's polygon, no address claim.
      expect(data.source).toBe("county-gis");
      expect(data.lotArea).toBe(5155);
      expect(data.dataQuality!.fields.boundaryGeoJson.confidence).toBe("high");
      expect(situsCalls(fetchMock)).toHaveLength(0);
    });

    it.each([
      ["a street line with no city or ZIP", "1421 NE 88th St"],
      ["text that is not a numbered street", "Maple Leaf, Seattle, WA 98115"],
    ])("skips it for %s", async (_label, address) => {
      const fetchMock = stubProviders({
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      const { data } = await lookup(PHONE_POINT, address, true);

      expect(data.source).toBe("fallback");
      expect(situsCalls(fetchMock)).toHaveLength(0);
    });

    it("skips the lookup when every point service failed, instead of doubling the wait", async () => {
      const fetchMock = stubProviders({
        kingPoint: UNAVAILABLE,
        waPoint: UNAVAILABLE,
        situsWindow: featuresResponse([feature(TARGET_LOT, TARGET_SITUS)]),
      });

      const { data } = await lookup(PHONE_POINT, GOOGLE_ADDRESS, true);

      expect(data.source).toBe("fallback");
      expect(situsCalls(fetchMock)).toHaveLength(0);
      // Nothing was tried, so the response does not claim a failed match.
      expect(data.dataQuality!.warnings.join(" ")).not.toContain(UNRESOLVED_TEXT);
    });
  });
});
