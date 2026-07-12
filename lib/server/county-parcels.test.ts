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

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    const fetchSpy = vi.fn().mockResolvedValue(geojsonResponse(SEATTLE_POLYGON));
    vi.stubGlobal("fetch", fetchSpy);
    expect((await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))!.county).toBe(
      "Multnomah",
    );
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))!.county).toBe("Travis");
  });
});

describe("fetchCountyParcel — response parsing", () => {
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
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { A_T_SQFT: 5000 }))
      .mockResolvedValueOnce(geojsonResponse(SEATTLE_POLYGON, { GIS_acres: 0.134816 }));
    vi.stubGlobal("fetch", fetchSpy);

    expect((await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng))!.lotAreaSqft).toBe(4052);
    expect(
      (await fetchCountyParcel(MULTNOMAH_POINT.lat, MULTNOMAH_POINT.lng))!.lotAreaSqft,
    ).toBe(5000);
    expect((await fetchCountyParcel(TRAVIS_POINT.lat, TRAVIS_POINT.lng))!.lotAreaSqft).toBe(5873);
  });

  it("takes the first ring of a MultiPolygon", async () => {
    const multi = { type: "MultiPolygon", coordinates: [SEATTLE_POLYGON.coordinates] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geojsonResponse(multi)));
    const result = await fetchCountyParcel(KING_POINT.lat, KING_POINT.lng);
    expect(result!.polygon.type).toBe("Polygon");
    expect(result!.polygon.coordinates).toEqual(SEATTLE_POLYGON.coordinates);
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
