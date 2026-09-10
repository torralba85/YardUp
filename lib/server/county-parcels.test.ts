import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COUNTY_GIS_SOURCES, fetchCountyParcel } from "./county-parcels";

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

const SEATTLE_POLYGON = {
  type: "Polygon",
  coordinates: [[
    [-122.32516, 47.68051],
    [-122.32496, 47.68051],
    [-122.32496, 47.68078],
    [-122.32516, 47.68078],
    [-122.32516, 47.68051],
  ]],
};

const FAR_PART = {
  type: "Polygon",
  coordinates: [[
    [-122.32616, 47.68051],
    [-122.32596, 47.68051],
    [-122.32596, 47.68078],
    [-122.32616, 47.68078],
    [-122.32616, 47.68051],
  ]],
};

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
    expect(king?.areaField).toBe("Shape__Area");
    expect(king?.areaUnit).toBe("sqft");
    const multnomah = COUNTY_GIS_SOURCES.find((source) => source.county === "Multnomah");
    expect(multnomah?.areaField).toBe("A_T_SQFT");
    const travis = COUNTY_GIS_SOURCES.find((source) => source.county === "Travis");
    expect(travis?.areaField).toBe("GIS_acres");
    expect(travis?.areaUnit).toBe("acres");
  });

  it("returns null immediately outside registered coverage", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await fetchCountyParcel(39.75, -104.99)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("routes a Seattle point to King County", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result?.county).toBe("King");
  });

  it("routes Portland and Austin to their county services", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))?.county).toBe("Multnomah");
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))?.county).toBe("Travis");
  });

  it("reserves deadline for a statewide fallback when the county request hangs", async () => {
    vi.useFakeTimers();
    const washington = COUNTY_GIS_SOURCES.find((source) => source.county === "Washington (statewide)")!;
    const fetchSpy = vi.fn((input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(washington.queryUrl)) {
        return Promise.resolve(geojsonResponse(SEATTLE_POLYGON));
      }
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const resultPromise = fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    await vi.advanceTimersByTimeAsync(2600);
    const result = await resultPromise;

    expect(result).not.toBeNull();
    expect(fetchSpy.mock.calls.some((call) => String(call[0]).startsWith(washington.queryUrl))).toBe(true);
  });
});

describe("fetchCountyParcel — response parsing", () => {
  it("computes area from geometry when no area field is usable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("reads square-foot and acreage fields", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { Shape__Area: 4051.87 }))
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { A_T_SQFT: 5000 }))
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { GIS_acres: 0.134816 }));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng))!.lotAreaSqft).toBe(4052);
    expect((await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))!.lotAreaSqft).toBe(5000);
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))!.lotAreaSqft).toBe(5873);
  });

  it("scopes multipart area to the returned point-containing polygon", async () => {
    const multi = { type: "MultiPolygon", coordinates: [FAR_PART.coordinates, SEATTLE_POLYGON.coordinates] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi, { Shape__Area: 99999 })));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
    expect(result!.lotAreaSqft).toBeGreaterThan(3000);
    expect(result!.lotAreaSqft).toBeLessThan(7000);
  });

  it("handles a single-part MultiPolygon", async () => {
    const multi = { type: "MultiPolygon", coordinates: [SEATTLE_POLYGON.coordinates] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
  });

  it("converts Esri JSON rings when the server ignores f=geojson", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse({ rings: SEATTLE_POLYGON.coordinates })));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon).toEqual({ type: "Polygon", coordinates: [SEATTLE_POLYGON.coordinates[0]] });
  });

  it("attaches Esri holes to their containing exterior", async () => {
    const cwOuter = [...SEATTLE_POLYGON.coordinates[0]].reverse();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse({ rings: [CCW_HOLE, cwOuter] })));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.coordinates).toEqual([cwOuter, CCW_HOLE]);
  });
});
