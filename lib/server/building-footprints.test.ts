import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import { fetchBuildingFootprint } from "./building-footprints";

const PARCEL: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.1, 47],
      [-122, 47],
      [-122, 47.1],
      [-122.1, 47.1],
      [-122.1, 47],
    ],
    [
      [-122.08, 47.02],
      [-122.02, 47.02],
      [-122.02, 47.08],
      [-122.08, 47.08],
      [-122.08, 47.02],
    ],
  ],
};

function structuresResponse(features: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ features }),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBuildingFootprint", () => {
  it("queries the parcel envelope and sums only structures whose centroids are on the lot", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      structuresResponse([
        {
          attributes: { SQFEET: 1000, LONGITUDE: -122.09, LATITUDE: 47.01 },
        },
        {
          attributes: { SQFEET: "250.6", LONGITUDE: "-122.01", LATITUDE: "47.09" },
        },
        {
          // Inside the parcel's hole, so it must not count.
          attributes: { SQFEET: 700, LONGITUDE: -122.05, LATITUDE: 47.05 },
        },
        {
          // Inside the query envelope but outside the parcel exterior.
          attributes: { SQFEET: 900, LONGITUDE: -122.11, LATITUDE: 47.05 },
        },
        {
          attributes: { SQFEET: -5, LONGITUDE: -122.09, LATITUDE: 47.01 },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchBuildingFootprint(PARCEL)).resolves.toEqual({
      totalSqft: 1251,
      largestSqft: 1000,
      structureCount: 2,
    });

    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.pathname).toContain("/USA_Structures_View/FeatureServer/0/query");
    expect(url.searchParams.get("geometryType")).toBe("esriGeometryEnvelope");
    expect(url.searchParams.get("inSR")).toBe("4326");
    expect(url.searchParams.get("outSR")).toBe("4326");
    expect(url.searchParams.get("outFields")).toBe("SQFEET,LONGITUDE,LATITUDE");
    expect(url.searchParams.get("returnGeometry")).toBe("true");
    expect(JSON.parse(url.searchParams.get("geometry")!)).toEqual({
      xmin: -122.1,
      ymin: 47,
      xmax: -122,
      ymax: 47.1,
      spatialReference: { wkid: 4326 },
    });
  });

  it("extracts primary and detached structure footprint polygons when geometry rings are returned", async () => {
    const garageRing = [
      [-122.012, 47.088],
      [-122.008, 47.088],
      [-122.008, 47.092],
      [-122.012, 47.092],
      [-122.012, 47.088],
    ];
    const mainHouseRing = [
      [-122.095, 47.005],
      [-122.085, 47.005],
      [-122.085, 47.015],
      [-122.095, 47.015],
      [-122.095, 47.005],
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        structuresResponse([
          {
            attributes: { SQFEET: 320, LONGITUDE: -122.01, LATITUDE: 47.09 },
            geometry: { rings: [garageRing] },
          },
          {
            attributes: { SQFEET: 1480, LONGITUDE: -122.09, LATITUDE: 47.01 },
            geometry: { rings: [mainHouseRing] },
          },
        ]),
      ),
    );

    await expect(fetchBuildingFootprint(PARCEL)).resolves.toEqual({
      totalSqft: 1800,
      largestSqft: 1480,
      structureCount: 2,
      primaryOutlineGeoJson: {
        type: "Polygon",
        coordinates: [mainHouseRing],
      },
      detachedOutlinesGeoJson: [
        {
          type: "Polygon",
          coordinates: [garageRing],
        },
      ],
    });
  });

  it("accepts GeoJSON properties and returns an explicit no-match result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        structuresResponse([
          { properties: { SQFEET: 500, LONGITUDE: -122.05, LATITUDE: 47.05 } },
        ]),
      ),
    );

    // The only candidate is inside the parcel hole.
    await expect(fetchBuildingFootprint(PARCEL)).resolves.toEqual({
      totalSqft: 0,
      largestSqft: 0,
      structureCount: 0,
    });
  });

  it("returns null without fetching for a malformed parcel polygon", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      fetchBuildingFootprint({ type: "Polygon", coordinates: [[]] }),
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null on HTTP, network, and malformed-body failures", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: {} }) });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchBuildingFootprint(PARCEL)).resolves.toBeNull();
    await expect(fetchBuildingFootprint(PARCEL)).resolves.toBeNull();
    await expect(fetchBuildingFootprint(PARCEL)).resolves.toBeNull();
  });

  it.each([
    ["truncated", { exceededTransferLimit: true }],
    ["provider error", { error: { code: 500, message: "Query failed" } }],
  ])("does not report a partial building total for a %s response", async (_label, metadata) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ attributes: { SQFEET: 1000, LONGITUDE: -122.09, LATITUDE: 47.01 } }],
        ...metadata,
      }),
    }));

    await expect(fetchBuildingFootprint(PARCEL)).resolves.toBeNull();
  });

  it("retains a successful empty collection as a no-match result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(structuresResponse([])));
    await expect(fetchBuildingFootprint(PARCEL)).resolves.toEqual({
      totalSqft: 0, largestSqft: 0, structureCount: 0,
    });
  });
});
