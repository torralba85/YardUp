import { describe, expect, it } from "vitest";
import { ParcelResolver } from "./parcel-resolver";

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
  return { type: "Polygon" as const, coordinates: [ring] };
}

import type { MarketData } from "@/lib/market/market-types";

describe("ParcelResolver", () => {
  const sampleMarketData: MarketData = {
    rentByBedroom: { studio: 1800, "1br": 2100, "2br": 2600 },
    costMultiplier: 1.15,
    operatingExpenseRatio: 0.28,
    source: "hud-zip",
    area: "Seattle, WA",
    asOf: "2026-Q1",
    confidence: "high",
  };

  it("resolves a full Regrid parcel with oriented geometry", async () => {
    const polygon = rotatedRectPolygon(47.6062, -122.3321, 50, 100, 30);
    const resolver = new ParcelResolver({
      regridApiKey: "test-regrid-key",
      fetchRegrid: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          parcels: {
            features: [
              {
                geometry: polygon,
                properties: {
                  fields: {
                    saddress: "123 Main St",
                    scity: "Seattle",
                    state2: "WA",
                    szip5: "98101",
                    ll_gisacre: 0.11478, // ~5000 sqft
                    ll_bldg_footprint_sqft: 1500,
                    zoning: "R1",
                  },
                },
              },
            ],
          },
        }),
      }),
      fetchCensusLocation: async () => ({
        state: "WA",
        county: "King",
        zip: "98101",
      }),
      resolveMarketData: async () => sampleMarketData,
    });

    const result = await resolver.resolve({
      lat: 47.6062,
      lng: -122.3321,
      address: "123 Main St, Seattle, WA",
    });

    expect(result.source).toBe("regrid");
    expect(result.address).toBe("123 Main St");
    expect(result.city).toBe("Seattle, WA 98101");
    expect(result.lotArea).toBe(5000);
    expect(result.existingHouseSqft).toBe(1500);
    expect(result.boundaryGeoJson).toEqual(polygon);
    expect(result.lotWidth).toBeCloseTo(50, 0);
    expect(result.lotLength).toBeCloseTo(100, 0);
    expect(result.marketData?.area).toBe("Seattle, WA");
  });

  it("falls back to proportions when Regrid has no polygon", async () => {
    const resolver = new ParcelResolver({
      regridApiKey: "test-regrid-key",
      fetchRegrid: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          parcels: {
            features: [
              {
                geometry: null,
                properties: {
                  fields: {
                    saddress: "456 Elm St",
                    scity: "Austin",
                    state2: "TX",
                    szip5: "78701",
                    ll_gisacre: 0.2, // ~8712 sqft
                  },
                },
              },
            ],
          },
        }),
      }),
      fetchCensusLocation: async () => ({
        state: "TX",
        county: "Travis",
        zip: "78701",
      }),
      resolveMarketData: async () => sampleMarketData,
    });

    const result = await resolver.resolve({ lat: 30.2672, lng: -97.7431 });

    expect(result.source).toBe("regrid");
    expect(result.boundaryGeoJson).toBeNull();
    expect(result.lotArea).toBe(8712);
    expect(result.lotWidth).toBeGreaterThan(0);
    expect(result.lotLength).toBeGreaterThan(0);
  });

  it("degrades gracefully to County GIS on Regrid 429 rate limit (ADR-0001)", async () => {
    const countyPolygon = rotatedRectPolygon(47.6062, -122.3321, 45, 90, 0);
    const resolver = new ParcelResolver({
      regridApiKey: "test-regrid-key",
      fetchRegrid: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: "rate limit" }),
      }),
      fetchCountyParcel: async () => ({
        lotAreaSqft: 4050,
        polygon: countyPolygon,
        county: "King",
        sourceUrl: "https://county.gov/gis",
      }),
      fetchBuildingFootprint: async () => ({
        totalSqft: 1200,
        largestSqft: 1200,
        structureCount: 1,
      }),
      fetchCensusLocation: async () => ({
        state: "WA",
        county: "King",
        zip: "98101",
      }),
      resolveMarketData: async () => sampleMarketData,
    });

    const result = await resolver.resolve({
      lat: 47.6062,
      lng: -122.3321,
      address: "789 Pine St, Seattle, WA",
    });

    expect(result.source).toBe("county-gis");
    expect(result.lotArea).toBe(4050);
    expect(result.existingHouseSqft).toBe(1200);
    expect(result.boundaryGeoJson).toEqual(countyPolygon);
    expect(result.county).toBe("King");
  });

  it("resolves via County GIS when no Regrid API key is configured", async () => {
    const countyPolygon = rotatedRectPolygon(47.6062, -122.3321, 60, 120, 0);
    const resolver = new ParcelResolver({
      regridApiKey: undefined,
      fetchCountyParcel: async () => ({
        lotAreaSqft: 7200,
        polygon: countyPolygon,
        county: "King",
        sourceUrl: "https://county.gov/gis",
      }),
      fetchBuildingFootprint: async () => null,
      fetchCensusLocation: async () => ({
        state: "WA",
        county: "King",
        zip: "98101",
      }),
      resolveMarketData: async () => sampleMarketData,
    });

    const result = await resolver.resolve({
      lat: 47.6062,
      lng: -122.3321,
      address: "1000 4th Ave, Seattle, WA",
    });

    expect(result.source).toBe("county-gis");
    expect(result.lotArea).toBe(7200);
    expect(result.existingHouseSqft).toBe(0); // No footprint found remains 0
    expect(result.boundaryGeoJson).toEqual(countyPolygon);
  });

  it("falls back to Demo Preset when County GIS returns null or zero area", async () => {
    const resolver = new ParcelResolver({
      regridApiKey: undefined,
      fetchCountyParcel: async () => null,
      fetchCensusLocation: async () => ({
        state: "WA",
        county: "King",
        zip: "98115",
      }),
      resolveMarketData: async () => sampleMarketData,
    });

    // Coordinates close to Seattle demo preset
    const result = await resolver.resolve({
      lat: 47.68,
      lng: -122.29,
      address: "1234 Oak Street, Seattle, WA",
    });

    expect(result.source).toBe("fallback");
    expect(result.zoning).toBe("R-1 (estimated)");
    expect(result.boundaryGeoJson).toBeNull();
    expect(result.lotArea).toBe(5000);
    expect(result.marketData).toBeDefined();
  });
});
