import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { polygonContainsPoint } from "@/lib/parcel-geometry";
import { parseStreetAddress } from "./address-match";
import {
  ADDRESS_MATCH_RADIUS_FT,
  COUNTY_GIS_SOURCES,
  fetchCountyParcelByAddress,
  verifyParcelAddressAtPoint,
} from "./county-parcels";

/**
 * Street-address verification against King County's official address-enriched
 * parcel layer.
 *
 * Geometry is synthetic but keeps the audit's shape: the guest point falls on a
 * lot officially published as 1245B (not the searched 1421), the phone point
 * falls on no lot, and the searched address belongs to a lot a short way east.
 * Attribute names are the layer's published fields.
 */

const GUEST_POINT = { lat: 47.6920824, lng: -122.3129897 };
const PHONE_POINT = { lat: 47.69217, lng: -122.31232 };
const FT_PER_DEG_LAT = 364000;

/** A widthFt (east-west) by lengthFt (north-south) lot centered on (lat, lng). */
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
/** The lot the searched address really belongs to: ~245 ft east of the guest point. */
const TARGET_LOT = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.001, 50, 103);
/** Next door to the target, ~61 ft east of it: shares its search window, does not overlap. */
const NEIGHBOR_LOT = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.00125, 50, 103);
const TARGET_POINT = { lat: GUEST_POINT.lat, lng: GUEST_POINT.lng + 0.001 };

const SEARCH = parseStreetAddress("1421 NE 88th St, Seattle, WA 98115, USA")!;

const LOCALITY = {
  CTYNAME: "SEATTLE",
  POSTALCTYNAME: "SEATTLE",
  ZIP5: "98115",
  STATE_ABBR: "WA",
};
const TARGET_SITUS = { PIN: "8562901005", ADDR_FULL: "1421 NE 88TH ST", ...LOCALITY };
const AUDIT_POINT_SITUS = { PIN: "6401670000", ADDR_FULL: "1245B NE 88TH ST", ...LOCALITY };
const ALLOWLIST = "PIN,ADDR_FULL,CTYNAME,POSTALCTYNAME,ZIP5,STATE_ABBR,Shape__Area";

function feature(geometry: unknown, properties: Record<string, unknown>) {
  return { type: "Feature", geometry, properties };
}

function featuresResponse(features: unknown[], extra: Record<string, unknown> = {}) {
  return { ok: true, status: 200, json: async () => ({ features, ...extra }) };
}

const KING = COUNTY_GIS_SOURCES.find((source) => source.county === "King")!;
const SITUS_URL = KING.situs!.queryUrl;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("registry", () => {
  it("registers an address endpoint only for King County, with an exact field allowlist", () => {
    expect(
      COUNTY_GIS_SOURCES.filter((source) => source.situs).map((source) => source.county),
    ).toEqual(["King"]);
    expect(SITUS_URL).toBe(
      "https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query",
    );
    expect(KING.situs!.fields).toEqual({
      id: "PIN",
      line: "ADDR_FULL",
      cities: ["CTYNAME", "POSTALCTYNAME"],
      zip: "ZIP5",
      state: "STATE_ABBR",
      area: "Shape__Area",
    });
  });

  it("keeps the geometry-only point layer as it was", () => {
    expect(KING.queryUrl).toBe(
      "https://services.arcgis.com/Ej0PsM5Aw677QF1W/ArcGIS/rest/services/PARCEL_AREA_439/FeatureServer/0/query",
    );
    expect(KING.areaField).toBe("Shape__Area");
  });

  it("test premise: the audit's geometry", () => {
    expect(polygonContainsPoint(POINT_LOT, GUEST_POINT.lng, GUEST_POINT.lat)).toBe(true);
    expect(polygonContainsPoint(POINT_LOT, PHONE_POINT.lng, PHONE_POINT.lat)).toBe(false);
    expect(polygonContainsPoint(TARGET_LOT, PHONE_POINT.lng, PHONE_POINT.lat)).toBe(false);
    expect(polygonContainsPoint(TARGET_LOT, TARGET_POINT.lng, TARGET_POINT.lat)).toBe(true);
    expect(ADDRESS_MATCH_RADIUS_FT).toBeGreaterThan(200);
  });
});

describe("verifyParcelAddressAtPoint", () => {
  it("verifies a point whose official parcel publishes the searched address", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(featuresResponse([feature(null, TARGET_SITUS)]));
    vi.stubGlobal("fetch", fetchSpy);

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("verified");
    expect(check.parcelId).toBe("8562901005");
    expect(check.localityConfirmed).toBe(true);
    expect(check.attempts).toEqual([
      expect.objectContaining({
        provider: "ArcGIS",
        dataset: "King parcel addresses",
        outcome: "matched",
      }),
    ]);
    // A point query for the allowlisted attributes only, with no geometry back.
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl.startsWith(SITUS_URL)).toBe(true);
    const params = new URL(calledUrl).searchParams;
    expect(params.get("outFields")).toBe(ALLOWLIST);
    expect(params.get("geometryType")).toBe("esriGeometryPoint");
    expect(params.get("returnGeometry")).toBe("false");
    expect(params.get("geometry")).toBe(`${TARGET_POINT.lng},${TARGET_POINT.lat}`);
  });

  it("never asks the address layer for every attribute (owner data lives there)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(featuresResponse([]));
    vi.stubGlobal("fetch", fetchSpy);

    await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    const outFields = new URL(String(fetchSpy.mock.calls[0][0])).searchParams.get("outFields");
    expect(outFields).not.toContain("*");
    expect(outFields).not.toMatch(/owner|taxpayer|mail|name_/i);
  });

  it("finds the audit's contradiction: the point's parcel is officially another address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(null, AUDIT_POINT_SITUS)])),
    );

    const check = await verifyParcelAddressAtPoint(GUEST_POINT.lat, GUEST_POINT.lng, SEARCH);

    expect(check.verdict).toBe("mismatch");
    // The parcel the point actually falls on, for the record; never returned as the match.
    expect(check.parcelId).toBe("6401670000");
    expect(check.attempts).toEqual([
      expect.objectContaining({
        outcome: "no-match",
        detail: expect.stringContaining("different street address"),
      }),
    ]);
    expect(check.attempts[0].detail).toContain("6401670000");
  });

  it.each([
    ["city", { CTYNAME: "SHORELINE", POSTALCTYNAME: "SHORELINE" }],
    ["ZIP", { ZIP5: "98125" }],
    ["state", { STATE_ABBR: "OR" }],
  ])("treats the same street line in another %s as a contradiction", async (_label, override) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(null, { ...TARGET_SITUS, ...override })])),
    );

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("mismatch");
    expect(check.attempts[0].detail).toContain("different city, ZIP or state");
  });

  it("treats two distinct parcels publishing the address at one point as a contradiction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([
          feature(null, TARGET_SITUS),
          feature(null, { ...TARGET_SITUS, PIN: "8562901010" }),
        ]),
      ),
    );

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("mismatch");
    expect(check.parcelId).toBeUndefined();
    expect(check.attempts[0]).toMatchObject({
      outcome: "invalid-response",
      detail: expect.stringContaining("Multiple distinct parcels"),
    });
  });

  it("accepts one parcel published as several features (multipart)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([feature(null, TARGET_SITUS), feature(null, TARGET_SITUS)]),
      ),
    );

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("verified");
    expect(check.parcelId).toBe("8562901005");
  });

  it("refuses overlapping distinct parcels even when exactly one publishes the searched address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([feature(null, AUDIT_POINT_SITUS), feature(null, TARGET_SITUS)]),
      ),
    );

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("mismatch");
    expect(check.parcelId).toBeUndefined();
    expect(check.attempts[0].detail).toContain("Multiple distinct parcels");
  });

  it("does not verify a point when another overlapping record has no identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse([
      feature(null, TARGET_SITUS),
      feature(null, { ...TARGET_SITUS, PIN: undefined }),
    ])));
    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);
    expect(check.verdict).toBe("unverified");
    expect(check.attempts[0].outcome).toBe("invalid-response");
  });

  it("does not verify a point from a truncated address response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse(
      [feature(null, TARGET_SITUS)], { exceededTransferLimit: true },
    )));
    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);
    expect(check.verdict).not.toBe("verified");
    expect(check.attempts[0].outcome).toBe("invalid-response");
  });

  it("marks the point unverified when the address layer has no parcel there", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse([])));

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("unverified");
    expect(check.attempts[0]).toMatchObject({ outcome: "no-match" });
  });

  it("marks the point unverified, not verified, when the parcel has no official identifier", async () => {
    const { PIN: _pin, ...withoutPin } = TARGET_SITUS;
    void _pin;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(null, withoutPin)])),
    );

    const check = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);

    expect(check.verdict).toBe("unverified");
    expect(check.parcelId).toBeUndefined();
    expect(check.attempts[0]).toMatchObject({ outcome: "invalid-response" });
  });

  it("marks the point unverified on an HTTP error or a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const http = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);
    expect(http.verdict).toBe("unverified");
    expect(http.attempts).toEqual([
      expect.objectContaining({ outcome: "provider-error", detail: "HTTP 503" }),
    ]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    const offline = await verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);
    expect(offline.verdict).toBe("unverified");
    expect(offline.attempts[0].outcome).toBe("provider-error");
  });

  it("marks the point unverified when the address layer hangs past its budget", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );

    const pending = verifyParcelAddressAtPoint(TARGET_POINT.lat, TARGET_POINT.lng, SEARCH);
    await vi.advanceTimersByTimeAsync(4100);
    const check = await pending;

    expect(check.verdict).toBe("unverified");
    expect(check.attempts).toEqual([expect.objectContaining({ outcome: "timeout" })]);
  });

  it("does not ask at all once the stage deadline has passed", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const check = await verifyParcelAddressAtPoint(
      TARGET_POINT.lat,
      TARGET_POINT.lng,
      SEARCH,
      Date.now() - 1,
    );

    expect(check.verdict).toBe("unverified");
    expect(check.attempts).toEqual([expect.objectContaining({ outcome: "timeout" })]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["a point only a statewide layer covers (Spokane)", 47.66, -117.42],
    ["a point outside every registered layer (Denver)", 39.75, -104.99],
    ["another county's point (Portland)", 45.5138, -122.6293],
  ])("is unsupported, and asks nothing, for %s", async (_label, lat, lng) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const check = await verifyParcelAddressAtPoint(lat, lng, SEARCH);

    expect(check).toEqual({ verdict: "unsupported", attempts: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("fetchCountyParcelByAddress", () => {
  it("finds the lot whose official address matches, from a point that misses every lot", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      featuresResponse([
        feature(POINT_LOT, AUDIT_POINT_SITUS),
        feature(TARGET_LOT, { ...TARGET_SITUS, Shape__Area: 5160.4 }),
        feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: "8562901010", ADDR_FULL: "1425 NE 88TH ST" }),
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).not.toBeNull();
    expect(parcel!.county).toBe("King");
    // The official identifier of the parcel that publishes the searched address.
    expect(parcel!.parcelId).toBe("8562901005");
    expect(parcel!.localityConfirmed).toBe(true);
    // The official area the address layer publishes for a single-part parcel.
    expect(parcel!.lotAreaSqft).toBe(5160);
    expect(parcel!.offsetFt).toBeGreaterThan(30);
    expect(parcel!.offsetFt).toBeLessThan(ADDRESS_MATCH_RADIUS_FT);
    // The moved coordinate is on the matched lot, not the lot the point fell on.
    expect(polygonContainsPoint(parcel!.polygon, parcel!.point.lng, parcel!.point.lat)).toBe(true);
    expect(polygonContainsPoint(POINT_LOT, parcel!.point.lng, parcel!.point.lat)).toBe(false);
    expect(attempts).toEqual([
      expect.objectContaining({
        provider: "ArcGIS",
        dataset: "King parcel addresses",
        outcome: "matched",
      }),
    ]);
    expect(attempts[0].detail).toContain("8562901005");
    expect(parcel!.attempt).toEqual(attempts[0]);

    // One bounded window on the address layer, and nothing else was asked.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl.startsWith(SITUS_URL)).toBe(true);
    const params = new URL(calledUrl).searchParams;
    expect(params.get("geometryType")).toBe("esriGeometryEnvelope");
    expect(params.get("outFields")).toBe(ALLOWLIST);
    const [minLng, minLat, maxLng, maxLat] = params.get("geometry")!.split(",").map(Number);
    expect(minLat).toBeLessThan(PHONE_POINT.lat);
    expect(maxLat).toBeGreaterThan(PHONE_POINT.lat);
    expect(minLng).toBeLessThan(PHONE_POINT.lng);
    expect(maxLng).toBeGreaterThan(PHONE_POINT.lng);
    expect((maxLat - minLat) * FT_PER_DEG_LAT).toBeCloseTo(2 * ADDRESS_MATCH_RADIUS_FT, 0);
  });

  it("does not use the nearest parcel when no parcel publishes the address", async () => {
    // Like the audit's window: many parcels, none of them the searched address.
    const others = Array.from({ length: 12 }, (_, index) =>
      feature(lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.0004 * index, 50, 103), {
        ...TARGET_SITUS,
        PIN: `99000000${index}`,
        ADDR_FULL: `${1101 + index * 2} NE 88TH ST`,
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse(others)));

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts).toEqual([
      expect.objectContaining({
        outcome: "no-match",
        detail: expect.stringContaining("No parcel near the searched point"),
      }),
    ]);
  });

  it.each([
    ["street name", { ADDR_FULL: "1421 NE 89TH ST" }],
    ["directional", { ADDR_FULL: "1421 NW 88TH ST" }],
    ["house number", { ADDR_FULL: "1423 NE 88TH ST" }],
    ["house-number letter", { ADDR_FULL: "1421B NE 88TH ST" }],
  ])("rejects a parcel published with the wrong %s", async (_label, override) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(TARGET_LOT, { ...TARGET_SITUS, ...override })])),
    );

    const { parcel } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
  });

  it.each([
    ["city", { CTYNAME: "SHORELINE", POSTALCTYNAME: "SHORELINE" }],
    ["ZIP", { ZIP5: "98125" }],
    ["state", { STATE_ABBR: "OR" }],
  ])("rejects the same street line published in another %s", async (_label, override) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(TARGET_LOT, { ...TARGET_SITUS, ...override })])),
    );

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts[0]).toMatchObject({
      outcome: "no-match",
      detail: expect.stringContaining("different city, ZIP or state"),
    });
  });

  it("refuses when two distinct parcels publish the address", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      featuresResponse([
        feature(TARGET_LOT, TARGET_SITUS),
        feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: "8562901010" }),
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts).toEqual([
      expect.objectContaining({
        outcome: "invalid-response",
        detail: expect.stringContaining("Multiple distinct parcels"),
      }),
    ]);
  });

  it("refuses distinct matching IDs even when one parcel has no usable geometry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse([
      feature(TARGET_LOT, TARGET_SITUS),
      feature(null, { ...TARGET_SITUS, PIN: "8562901010" }),
    ])));
    const { parcel, attempts } = await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    expect(parcel).toBeNull();
    expect(attempts[0]).toMatchObject({
      outcome: "invalid-response",
      detail: expect.stringContaining("Multiple distinct parcels"),
    });
  });

  it("does not prove a unique window match by dropping a record with missing identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse([
      feature(TARGET_LOT, TARGET_SITUS),
      feature(NEIGHBOR_LOT, { ...TARGET_SITUS, PIN: undefined }),
    ])));
    const { parcel, attempts } = await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    expect(parcel).toBeNull();
    expect(attempts[0].outcome).toBe("invalid-response");
  });

  it.each([
    { PIN: "unrelated-vacant", ADDR_FULL: null },
    { ...TARGET_SITUS, PIN: undefined, ADDR_FULL: "1423 NE 88TH ST" },
  ])("does not let unrelated unpublished or different situs invalidate a unique match", async (unrelated) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(featuresResponse([
      feature(TARGET_LOT, TARGET_SITUS),
      feature(NEIGHBOR_LOT, unrelated),
    ])));
    const { parcel } = await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    expect(parcel?.parcelId).toBe(TARGET_SITUS.PIN);
  });

  it("accepts one parcel published as several features and scores it as multipart", async () => {
    const island = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.0016, 20, 30);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([
          feature(TARGET_LOT, { ...TARGET_SITUS, Shape__Area: 9999 }),
          feature(island, { ...TARGET_SITUS, Shape__Area: 9999 }),
        ]),
      ),
    );

    const { parcel } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).not.toBeNull();
    expect(parcel!.parcelId).toBe("8562901005");
    // The attribute covers every part; the largest part's own area is reported.
    expect(parcel!.lotAreaSqft).not.toBe(9999);
    expect(parcel!.lotAreaSqft).toBeGreaterThan(5100);
    expect(parcel!.lotAreaSqft).toBeLessThan(5200);
    expect(polygonContainsPoint(TARGET_LOT, parcel!.point.lng, parcel!.point.lat)).toBe(true);
  });

  it("falls back to the polygon's own area when the layer publishes none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(TARGET_LOT, TARGET_SITUS)])),
    );

    const { parcel } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    // 50 x 103 ft, measured from the returned geometry.
    expect(parcel!.lotAreaSqft).toBeGreaterThan(5100);
    expect(parcel!.lotAreaSqft).toBeLessThan(5200);
  });

  it("refuses a matching parcel that lies outside the search window", async () => {
    const distant = lot(GUEST_POINT.lat, GUEST_POINT.lng + 0.01, 50, 103);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(distant, TARGET_SITUS)])),
    );

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts[0]).toMatchObject({
      outcome: "no-match",
      detail: expect.stringContaining("farther"),
    });
  });

  it("refuses when the window is truncated, because uniqueness cannot be shown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([feature(TARGET_LOT, TARGET_SITUS)], { exceededTransferLimit: true }),
      ),
    );

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts).toEqual([expect.objectContaining({ outcome: "invalid-response" })]);
  });

  it("refuses parcels that carry no official identifier", async () => {
    const { PIN: _pin, ...withoutPin } = TARGET_SITUS;
    void _pin;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(featuresResponse([feature(TARGET_LOT, withoutPin)])),
    );

    const { parcel, attempts } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel).toBeNull();
    expect(attempts).toEqual([
      expect.objectContaining({
        outcome: "invalid-response",
        detail: expect.stringContaining("without a parcel identifier"),
      }),
    ]);
  });

  it("matches, and says so, when the layer published neither city nor ZIP for the parcel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        featuresResponse([feature(TARGET_LOT, { PIN: "8562901005", ADDR_FULL: "1421 NE 88TH ST" })]),
      ),
    );

    const { parcel } = await fetchCountyParcelByAddress(
      PHONE_POINT.lat,
      PHONE_POINT.lng,
      SEARCH,
    );

    expect(parcel?.localityConfirmed).toBe(false);
  });

  it("reports an HTTP error and a network failure as attempts, never throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const unavailable = await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    expect(unavailable.parcel).toBeNull();
    expect(unavailable.attempts).toEqual([
      expect.objectContaining({ outcome: "provider-error", detail: "HTTP 503" }),
    ]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    const offline = await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    expect(offline.parcel).toBeNull();
    expect(offline.attempts).toEqual([expect.objectContaining({ outcome: "provider-error" })]);
  });

  it("times out as an attempt when the address layer hangs", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );

    const pending = fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);
    await vi.advanceTimersByTimeAsync(4100);
    const { parcel, attempts } = await pending;

    expect(parcel).toBeNull();
    expect(attempts).toEqual([expect.objectContaining({ outcome: "timeout" })]);
  });

  it("asks only the address layer: never the statewide layer or the geometry-only layer", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(featuresResponse([]));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchCountyParcelByAddress(PHONE_POINT.lat, PHONE_POINT.lng, SEARCH);

    const urls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(urls).toHaveLength(1);
    expect(urls[0].startsWith(SITUS_URL)).toBe(true);
  });

  it("returns nothing, and asks nothing, where no address layer is registered", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const spokane = await fetchCountyParcelByAddress(47.66, -117.42, SEARCH);
    const denver = await fetchCountyParcelByAddress(39.75, -104.99, SEARCH);

    expect(spokane).toEqual({ parcel: null, attempts: [] });
    expect(denver).toEqual({ parcel: null, attempts: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
