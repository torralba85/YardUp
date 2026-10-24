import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTY_GIS_SOURCES, fetchCountyParcel } from "./county-parcels";

/** A GeoJSON FeatureCollection response like ArcGIS f=geojson returns. */
function geojsonResponse(geometry: unknown, properties: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ features: [{ type: "Feature", geometry, properties }] }),
  };
}

const KING_POINT = { lat: 47.6806478, lng: -122.3250591 };
const MULTNOMAH_POINT = { lat: 45.5137964, lng: -122.6293264 };
const TRAVIS_POINT = { lat: 30.2531976, lng: -97.7679659 };
const LA_POINT = { lat: 34.0522, lng: -118.2437 };
const VENTURA_POINT = { lat: 34.2746, lng: -119.229 };
const SAN_BERNARDINO_POINT = { lat: 34.1083, lng: -117.2898 };

function polygonAt(point: { lat: number; lng: number }) {
  return { ...SEATTLE_POLYGON, coordinates: SEATTLE_POLYGON.coordinates.map((ring) => ring.map(([lng, lat]) => [lng + point.lng - KING_POINT.lng, lat + point.lat - KING_POINT.lat])) };
}

/** A ~50x100 ft lot around the verified King County residential fixture. */
const SEATTLE_POLYGON = {
  type: "Polygon",
  coordinates: [
    [
      [-122.32516, 47.68051],
      [-122.32496, 47.68051],
      [-122.32496, 47.68078],
      [-122.32516, 47.68078],
      [-122.32516, 47.68051],
    ],
  ],
};

/** Same-size part ~250 ft west — never contains the King fixture point. */
const FAR_PART = {
  type: "Polygon",
  coordinates: [
    [
      [-122.32616, 47.68051],
      [-122.32596, 47.68051],
      [-122.32596, 47.68078],
      [-122.32616, 47.68078],
      [-122.32616, 47.68051],
    ],
  ],
};

/** ~850 sq ft counterclockwise hole inside SEATTLE_POLYGON. */
const CCW_HOLE = [
  [-122.3251, 47.68058],
  [-122.32502, 47.68058],
  [-122.32502, 47.6807],
  [-122.3251, 47.6807],
  [-122.3251, 47.68058],
];

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchCountyParcel — routing", () => {
  it("registers the verified current county query endpoints and area fields", () => {
    const king = COUNTY_GIS_SOURCES.find((source) => source.county === "King");
    expect(king?.queryUrl).toBe(
      "https://services.arcgis.com/Ej0PsM5Aw677QF1W/ArcGIS/rest/services/PARCEL_AREA_439/FeatureServer/0/query",
    );
    expect(king?.areaField).toBe("Shape__Area");
    expect(king?.areaUnit).toBe("sqft");

    const multnomah = COUNTY_GIS_SOURCES.find((source) => source.county === "Multnomah");
    expect(multnomah?.queryUrl).toBe(
      "https://www.portlandmaps.com/arcgis/rest/services/Public/Taxlots/MapServer/0/query",
    );
    expect(multnomah?.areaField).toBe("A_T_SQFT");
    expect(multnomah?.areaUnit).toBe("sqft");

    const travis = COUNTY_GIS_SOURCES.find((source) => source.county === "Travis");
    expect(travis?.queryUrl).toBe(
      "https://taxmaps.traviscountytx.gov/arcgis/rest/services/Parcels/MapServer/0/query",
    );
    expect(travis?.areaField).toBe("GIS_acres");
    expect(travis?.areaUnit).toBe("acres");

    const caCounties = [
      "Los Angeles",
      "San Diego",
      "Orange",
      "Riverside",
      "San Bernardino",
      "Ventura",
      "Santa Barbara",
      "Santa Clara",
      "San Mateo",
      "Alameda",
      "Contra Costa",
      "Sacramento",
    ];
    const caStatewideIndex = COUNTY_GIS_SOURCES.findIndex(
      (source) => source.county === "California (statewide)",
    );
    for (const countyName of caCounties) {
      const idx = COUNTY_GIS_SOURCES.findIndex((source) => source.county === countyName);
      expect(idx, `${countyName} registered`).toBeGreaterThanOrEqual(0);
      expect(idx, `${countyName} ahead of California (statewide)`).toBeLessThan(caStatewideIndex);
    }
  });

  it("returns null immediately for a point outside every registered county", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    // Denver, CO — no registered county
    const result = await fetchCountyParcel(39.75, -104.99);
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes a Seattle point to King County", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result).not.toBeNull();
    expect(result!.county).toBe("King");
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    const king = COUNTY_GIS_SOURCES.find((s) => s.county === "King")!;
    expect(calledUrl.startsWith(king.queryUrl)).toBe(true);
    expect(calledUrl).toContain("geometryType=esriGeometryPoint");
    expect(calledUrl).toContain("outSR=4326");
  });

  it("routes a Portland point to Multnomah and an Austin point to Travis", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(geojsonResponse(polygonAt(MULTNOMAH_POINT)))
      .mockResolvedValueOnce(geojsonResponse(polygonAt(TRAVIS_POINT)));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))!.county).toBe(
      "Multnomah",
    );
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))!.county).toBe("Travis");
  });

  it("routes a Los Angeles point to Los Angeles County and sums main building square footage", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      geojsonResponse(polygonAt(LA_POINT), {
        "Shape.STArea()": 7250.4,
        SQFTmain1: 1680,
        SQFTmain2: 420,
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchCountyParcel(LA_POINT.lat, LA_POINT.lng);
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Los Angeles");
    expect(result!.lotAreaSqft).toBe(7250);
    expect(result!.areaBasis).toBe("reported");
    expect(result!.buildingSqft).toBe(2100);
    const outFields = new URL(String(fetchSpy.mock.calls[0][0])).searchParams.get("outFields");
    expect(outFields).toBe("Shape.STArea(),SQFTmain1,SQFTmain2,SQFTmain3,SQFTmain4,SQFTmain5");
  });

  it("extracts county zoning and building square footage when published (Ventura, San Bernardino)", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        geojsonResponse(polygonAt(VENTURA_POINT), {
          ACREAGE: "0.15",
          SQ_FT_I: "1840",
          ZONE: "R1-6",
        }),
      )
      .mockResolvedValueOnce(
        geojsonResponse(polygonAt(SAN_BERNARDINO_POINT), {
          Acreage: 0.2,
          Zoning: "CITY OF SAN BERNARDINO",
        }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const ventura = await fetchCountyParcel(VENTURA_POINT.lat, VENTURA_POINT.lng);
    expect(ventura).toMatchObject({
      county: "Ventura",
      lotAreaSqft: 6534,
      areaBasis: "reported",
      buildingSqft: 1840,
      zoning: "R1-6",
    });

    const sanBernardino = await fetchCountyParcel(
      SAN_BERNARDINO_POINT.lat,
      SAN_BERNARDINO_POINT.lng,
    );
    expect(sanBernardino).toMatchObject({
      county: "San Bernardino",
      lotAreaSqft: 8712,
      areaBasis: "reported",
    });
    // Municipal placeholder strings ("CITY OF ...") must not be surfaced as a zoning code.
    expect(sanBernardino!.zoning).toBeUndefined();
  });

  it("reserves budget for the statewide fallback when the county service hangs", async () => {
    vi.useFakeTimers();
    const washington = COUNTY_GIS_SOURCES.find(
      (source) => source.county === "Washington (statewide)",
    )!;
    // King never answers. Before the budget was shared, its request held the
    // whole 5s deadline and Washington was never tried at all.
    const fetchSpy = vi.fn((input: unknown, init?: RequestInit) => {
      if (String(input).startsWith(washington.queryUrl)) {
        return Promise.resolve(geojsonResponse(SEATTLE_POLYGON));
      }
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const pending = fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    // Past King's half of the deadline, but well inside the full 5s.
    await vi.advanceTimersByTimeAsync(2600);
    const result = await pending;

    expect(result).not.toBeNull();
    expect(result!.county).toBe("Washington (statewide)");
    expect(
      fetchSpy.mock.calls.some((call) =>
        String(call[0]).startsWith(washington.queryUrl),
      ),
    ).toBe(true);
  });
});

describe("fetchCountyParcel — response parsing", () => {
  it("refuses a neighbor polygon that does not contain the requested point", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(FAR_PART)));
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });
  it("refuses a point inside a polygon's hole", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse({ ...SEATTLE_POLYGON, coordinates: [...SEATTLE_POLYGON.coordinates, CCW_HOLE] })));
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });
  it("returns the polygon and computes area from geometry when no area field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.type).toBe("Polygon");
    // ~50 ft x ~98 ft lot → roughly 4,900 sq ft
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("reads verified square-foot area fields and converts verified acreage fields", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { Shape__Area: 4051.87 }))
      .mockResolvedValueOnce(geojsonResponse(polygonAt(MULTNOMAH_POINT), { A_T_SQFT: 5000 }))
      .mockResolvedValueOnce(geojsonResponse(polygonAt(TRAVIS_POINT), { GIS_acres: 0.134816 }));
    vi.stubGlobal("fetch", fetchSpy);

    expect((await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng))!.lotAreaSqft).toBe(4052);
    expect(
      (await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))!.lotAreaSqft,
    ).toBe(5000);
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))!.lotAreaSqft).toBe(5873);
  });

  it("handles a single-part MultiPolygon", async () => {
    const multi = { type: "MultiPolygon", coordinates: [SEATTLE_POLYGON.coordinates] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.type).toBe("Polygon");
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
  });

  it("scopes multipart area to the part it returns, not the sum of all parts", async () => {
    // A second split-parcel part ~250 ft west of the query point, listed
    // first so selection cannot pass by luck of array order.
    const multi = {
      type: "MultiPolygon",
      coordinates: [FAR_PART.coordinates, SEATTLE_POLYGON.coordinates],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
    // Downstream measures building coverage against the polygon returned
    // here, so the area must describe that one ~4,900 sq ft part alone —
    // summing both parts would understate how much of the lot is built on.
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("ignores a whole-feature area field on a multipart parcel", async () => {
    // The provider's field covers both parts; only the returned part counts.
    const multi = {
      type: "MultiPolygon",
      coordinates: [FAR_PART.coordinates, SEATTLE_POLYGON.coordinates],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geojsonResponse(multi, { Shape__Area: 99999 })),
    );
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("still prefers the provider's area field on a single-part parcel", async () => {
    // Single-part features share their scope with the returned polygon, so
    // the assessor's own number stays more authoritative than the geometry.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(geojsonResponse(SEATTLE_POLYGON, { Shape__Area: 4051.87 })),
    );
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.lotAreaSqft).toBe(4052);
  });

  it("converts Esri JSON rings when the server ignores f=geojson", async () => {
    const esriGeometry = { rings: SEATTLE_POLYGON.coordinates };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon).toEqual({
      type: "Polygon",
      coordinates: [SEATTLE_POLYGON.coordinates[0]],
    });
  });

  it("attaches Esri holes to their containing exterior even when listed first", async () => {
    const cwOuter = [...SEATTLE_POLYGON.coordinates[0]].reverse();
    // Hole listed before its shell — order must not matter.
    const esriGeometry = { rings: [CCW_HOLE, cwOuter] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(47.68053, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([cwOuter, CCW_HOLE]);
    expect(result!.lotAreaSqft).toBeGreaterThan(3400);
    expect(result!.lotAreaSqft).toBeLessThan(4600);
  });

  it("groups a hole-first sloppy-wound shell before assigning its hole", async () => {
    // Both rings use counterclockwise winding. The larger ring is a
    // sloppily-wound exterior and must be promoted before the smaller hole.
    const sloppyOuter = SEATTLE_POLYGON.coordinates[0];
    const esriGeometry = { rings: [CCW_HOLE, sloppyOuter] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(47.68053, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([sloppyOuter, CCW_HOLE]);
    expect(result!.lotAreaSqft).toBeGreaterThan(3400);
    expect(result!.lotAreaSqft).toBeLessThan(4600);
  });

  it("attaches an Esri hole to the smallest containing exterior", async () => {
    const cwOuter = [...SEATTLE_POLYGON.coordinates[0]].reverse();
    const island = [
      [-122.32508, 47.68062],
      [-122.32504, 47.68062],
      [-122.32504, 47.68068],
      [-122.32508, 47.68068],
      [-122.32508, 47.68062],
    ];
    const cwIsland = [...island].reverse();
    const islandHole = [
      [-122.325075, 47.680625],
      [-122.325065, 47.680625],
      [-122.325065, 47.680635],
      [-122.325075, 47.680635],
      [-122.325075, 47.680625],
    ];
    const esriGeometry = {
      rings: [cwOuter, cwIsland, CCW_HOLE, islandHole],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([cwIsland, islandHole]);
  });

  it("prefers an island part over a donut whose hole contains the point", async () => {
    // The query point sits inside CCW_HOLE. Part A is a donut (Seattle outer
    // ring with that hole); part B is an island inside the hole around the
    // point. Hole-aware containment must pick the island, not the donut.
    const island = [
      [-122.32508, 47.68062],
      [-122.32504, 47.68062],
      [-122.32504, 47.68068],
      [-122.32508, 47.68068],
      [-122.32508, 47.68062],
    ];
    const multi = {
      type: "MultiPolygon",
      coordinates: [
        [SEATTLE_POLYGON.coordinates[0], CCW_HOLE],
        [island],
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([island]);
  });

  it("reads attributes when properties is present but empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              properties: {},
              attributes: { Shape__Area: 4051.87 },
              geometry: SEATTLE_POLYGON,
            },
          ],
        }),
      }),
    );
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.lotAreaSqft).toBe(4052);
  });

  it("keeps Esri hole rings and subtracts them from the computed area", async () => {
    // Esri winding: clockwise exterior, counterclockwise hole.
    const cwOuter = [...SEATTLE_POLYGON.coordinates[0]].reverse();
    const esriGeometry = { rings: [cwOuter, CCW_HOLE] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(esriGeometry)));
    const result = await fetchCountyParcel(47.68053, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([cwOuter, CCW_HOLE]);
    // ~4,900 sq ft outer minus ~850 sq ft hole.
    expect(result!.lotAreaSqft).toBeGreaterThan(3400);
    expect(result!.lotAreaSqft).toBeLessThan(4600);
  });

  it("reads the area field from Esri JSON attributes when properties are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              attributes: { Shape__Area: 4051.87 },
              geometry: { rings: SEATTLE_POLYGON.coordinates },
            },
          ],
        }),
      }),
    );
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.lotAreaSqft).toBe(4052);
  });

  it("parses string-typed area fields and rejects ambiguous ones", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { Shape__Area: "4051.87" }))
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { Shape__Area: "4,051" }));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng))!.lotAreaSqft).toBe(4052);
    // "4,051" is ambiguous → fall back to the computed geometry area.
    const fallback = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(fallback!.lotAreaSqft).toBeGreaterThan(3000);
    expect(fallback!.lotAreaSqft).toBeLessThan(7000);
  });

  it("prefers the point-containing feature over earlier or larger stacked features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            { type: "Feature", geometry: null, properties: {} },
            { type: "Feature", geometry: FAR_PART, properties: { Shape__Area: 99999 } },
            { type: "Feature", geometry: SEATTLE_POLYGON, properties: { Shape__Area: 4052 } },
          ],
        }),
      }),
    );
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
    expect(result!.lotAreaSqft).toBe(4052);
  });
});

describe("fetchCountyParcel — failure modes (must all return null, never throw)", () => {
  it("returns null on non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });

  it("returns null on empty feature set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ features: [] }) }),
    );
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });

  it("returns null on malformed geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geojsonResponse({ type: "Point", coordinates: [0, 0] })),
    );
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });

  it("returns null on malformed JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );
    expect(await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng)).toBeNull();
  });
});

describe("fetchCountyParcel — statewide backstop", () => {
  /** Manhattan: inside the New York statewide bbox and no county service. */
  const NY_POINT = { lat: 40.7484, lng: -73.9857 };
  /** A ~50x100 ft lot around NY_POINT. */
  const NY_POLYGON = {
    type: "Polygon",
    coordinates: [
      [
        [-73.98576, 40.74833],
        [-73.98558, 40.74833],
        [-73.98558, 40.74861],
        [-73.98576, 40.74861],
        [-73.98576, 40.74833],
      ],
    ],
  };

  it("registers the verified statewide query endpoints and area fields", () => {
    const byLabel = (label: string) =>
      COUNTY_GIS_SOURCES.find((source) => source.county === label);

    expect(byLabel("New York (statewide)")?.queryUrl).toBe(
      "https://gisservices.its.ny.gov/arcgis/rest/services/NYS_Tax_Parcels_Public/MapServer/1/query",
    );
    expect(byLabel("New York (statewide)")?.areaField).toBe("SQ_FT");
    expect(byLabel("New York (statewide)")?.areaUnit).toBe("sqft");
    expect(byLabel("Ohio (statewide)")?.areaUnit).toBe("acres");
    expect(byLabel("Wisconsin (statewide)")?.areaField).toBe("GISACRES");
    expect(byLabel("Florida (statewide)")?.areaField).toBe("LND_SQFOOT");
    // California and Washington publish no area attribute; the module falls
    // back to the polygon's own computed area for those.
    expect(byLabel("California (statewide)")?.areaField).toBeUndefined();
    expect(byLabel("Washington (statewide)")?.areaField).toBeUndefined();
  });

  it("orders county services ahead of the statewide layer covering them", () => {
    const kingIndex = COUNTY_GIS_SOURCES.findIndex((s) => s.county === "King");
    const waIndex = COUNTY_GIS_SOURCES.findIndex(
      (s) => s.county === "Washington (statewide)",
    );
    expect(kingIndex).toBeGreaterThanOrEqual(0);
    expect(kingIndex).toBeLessThan(waIndex);
  });

  it("falls through to the statewide layer when the county service has no parcel", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ features: [] }) })
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Washington (statewide)");
    const king = COUNTY_GIS_SOURCES.find((s) => s.county === "King")!;
    const wa = COUNTY_GIS_SOURCES.find((s) => s.county === "Washington (statewide)")!;
    expect(String(fetchSpy.mock.calls[0][0]).startsWith(king.queryUrl)).toBe(true);
    expect(String(fetchSpy.mock.calls[1][0]).startsWith(wa.queryUrl)).toBe(true);
  });

  it("falls through when the county service errors rather than ending the lookup", async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.county).toBe("Washington (statewide)");
  });

  it("reads the real county name from a statewide layer's attributes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geojsonResponse(NY_POLYGON, { SQ_FT: 4000, COUNTY_NAME: "Albany" }),
      ),
    );
    const result = await fetchCountyParcel(NY_POINT.lat, NY_POINT.lng);
    expect(result!.county).toBe("Albany");
    expect(result!.lotAreaSqft).toBe(4000);
  });

  it("requests both the area and county attributes for a statewide layer", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(NY_POLYGON, { SQ_FT: 4000 }));
    vi.stubGlobal("fetch", fetchSpy);
    await fetchCountyParcel(NY_POINT.lat, NY_POINT.lng);
    const outFields = new URL(String(fetchSpy.mock.calls[0][0])).searchParams.get("outFields");
    expect(outFields).toBe("SQ_FT,COUNTY_NAME");
  });

  it("ignores a FIPS code sitting in the county-name attribute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geojsonResponse(NY_POLYGON, { SQ_FT: 4000, COUNTY_NAME: "36" })),
    );
    const result = await fetchCountyParcel(NY_POINT.lat, NY_POINT.lng);
    expect(result!.county).toBe("New York (statewide)");
  });

  it("strips a County suffix from a statewide layer's county attribute", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          geojsonResponse(NY_POLYGON, { SQ_FT: 4000, COUNTY_NAME: "Albany County" }),
        ),
    );
    const result = await fetchCountyParcel(NY_POINT.lat, NY_POINT.lng);
    expect(result!.county).toBe("Albany");
  });
});
