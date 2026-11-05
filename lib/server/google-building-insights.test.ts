import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import {
  fetchGoogleBuildingGeometry,
  fetchGoogleBuildingOutline,
  fetchGoogleSolarBuildingInsights,
} from "./google-building-insights";

const PARCEL_POLYGON: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-117.162, 32.715],
      [-117.161, 32.715],
      [-117.161, 32.716],
      [-117.162, 32.716],
      [-117.162, 32.715],
    ],
  ],
};

const BUILDING_POLYGON: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-117.1616, 32.7154],
      [-117.1614, 32.7154],
      [-117.1614, 32.7156],
      [-117.1616, 32.7156],
      [-117.1616, 32.7154],
    ],
  ],
};

const SOLAR_RESPONSE = {
  center: { latitude: 32.7155, longitude: -117.1615 },
  solarPotential: {
    buildingStats: { groundAreaMeters2: 140 },
    roofSegmentStats: [
      { pitchDegrees: 18.5, azimuthDegrees: 90, stats: { groundAreaMeters2: 140 } },
    ],
  },
};

function runtimeTokenResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: "runtime-oauth-token", expires_in: 3600 }),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.stubEnv("GOOGLE_CLOUD_PROJECT", "");
  vi.stubEnv("GCLOUD_PROJECT", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchGoogleBuildingOutline", () => {
  it("queries Geocoding v4 destinations with the GMP solution header and returns the building outline + entrance", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        destinations: [
          {
            primary: {
              structureType: "BUILDING",
              displayPolygon: BUILDING_POLYGON,
            },
            entrances: [
              {
                location: { latitude: 32.71541, longitude: -117.1615 },
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await fetchGoogleBuildingOutline({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
      parcelPolygon: PARCEL_POLYGON,
    });

    expect(res).not.toBeNull();
    expect(res?.outlineGeoJson).toEqual(BUILDING_POLYGON);
    expect(res?.entranceLatLng).toEqual({ lat: 32.71541, lng: -117.1615 });
    expect(res?.footprintSqft).toBeGreaterThan(1000);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://geocode.googleapis.com/v4/geocode/destinations");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-gmp-key");
    expect(headers["X-Goog-Maps-Solution-ID"]).toBe("gmp_git_agentskills_v1");
    expect(headers["X-Goog-FieldMask"]).toContain("destinations.primary.displayPolygon");
  });

  it("rejects a building outline that lies completely outside the subject parcel", async () => {
    const neighborPolygon: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [
        [
          [-117.17, 32.72],
          [-117.169, 32.72],
          [-117.169, 32.721],
          [-117.17, 32.721],
          [-117.17, 32.72],
        ],
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          destinations: [
            {
              primary: {
                structureType: "BUILDING",
                displayPolygon: neighborPolygon,
              },
            },
          ],
        }),
      }),
    );

    const res = await fetchGoogleBuildingOutline({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
      parcelPolygon: PARCEL_POLYGON,
    });

    expect(res).toBeNull();
  });
});

describe("fetchGoogleSolarBuildingInsights", () => {
  it("queries Solar API buildingInsights:findClosest and computes area-weighted roof pitch and predominant azimuth", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        center: { latitude: 32.7155, longitude: -117.1615 },
        solarPotential: {
          buildingStats: { groundAreaMeters2: 150 },
          roofSegmentStats: [
            {
              pitchDegrees: 22,
              azimuthDegrees: 180,
              stats: { groundAreaMeters2: 90 },
            },
            {
              pitchDegrees: 22,
              azimuthDegrees: 0,
              stats: { groundAreaMeters2: 60 },
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await fetchGoogleSolarBuildingInsights({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
      parcelPolygon: PARCEL_POLYGON,
    });

    expect(res).toEqual({
      roofPitchDegrees: 22,
      roofAzimuthDegrees: 180,
      footprintSqft: Math.round(150 * 10.7639104),
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://solar.googleapis.com/v1/buildingInsights:findClosest");
    expect((init.headers as Record<string, string>)["X-Goog-Maps-Solution-ID"]).toBe(
      "gmp_git_agentskills_v1",
    );
  });
});

describe("Google building auth", () => {
  it("sends Solar requests with the key in a header, never the URL, off Google Cloud", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => SOLAR_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchSpy);

    await fetchGoogleSolarBuildingInsights({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("test-gmp-key");
    expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("test-gmp-key");
  });

  it("calls Solar and Geocoding v4 as the runtime service account, without the API key", async () => {
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "yardup-2026");
    const fetchSpy = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("metadata.google.internal")) return runtimeTokenResponse();
      return {
        ok: true,
        status: 200,
        json: async () =>
          input.includes("solar.googleapis.com")
            ? SOLAR_RESPONSE
            : { destinations: [{ primary: { displayPolygon: BUILDING_POLYGON } }] },
      };
    });
    vi.stubGlobal("fetch", fetchSpy);
    const insights = await import("./google-building-insights");

    await insights.fetchGoogleBuildingOutline({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
    });
    await insights.fetchGoogleSolarBuildingInsights({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
    });

    const googleCalls = (fetchSpy.mock.calls as [string, RequestInit][]).filter(
      ([url]) => !url.includes("metadata.google.internal"),
    );
    expect(googleCalls).toHaveLength(2);
    for (const [url, init] of googleCalls) {
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer runtime-oauth-token");
      expect(headers["X-Goog-User-Project"]).toBe("yardup-2026");
      expect(headers["X-Goog-Api-Key"]).toBeUndefined();
      expect(url).not.toContain("test-gmp-key");
    }
  });

  it("reuses one runtime token across calls", async () => {
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "yardup-2026");
    const fetchSpy = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("metadata.google.internal")) return runtimeTokenResponse();
      return { ok: true, status: 200, json: async () => SOLAR_RESPONSE };
    });
    vi.stubGlobal("fetch", fetchSpy);
    const insights = await import("./google-building-insights");

    await insights.fetchGoogleSolarBuildingInsights({ lat: 32.7155, lng: -117.1615 });
    await insights.fetchGoogleSolarBuildingInsights({ lat: 32.7155, lng: -117.1615 });

    const metadataCalls = (fetchSpy.mock.calls as [string, RequestInit][]).filter(([url]) =>
      url.includes("metadata.google.internal"),
    );
    expect(metadataCalls).toHaveLength(1);
  });

  it("falls back to the API key when the metadata server fails", async () => {
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "yardup-2026");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("metadata.google.internal")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => SOLAR_RESPONSE };
    });
    vi.stubGlobal("fetch", fetchSpy);
    const insights = await import("./google-building-insights");

    const res = await insights.fetchGoogleSolarBuildingInsights({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
    });

    expect(res?.roofPitchDegrees).toBe(18.5);
    const [, init] = fetchSpy.mock.calls[1] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-gmp-key");
    expect(headers.Authorization).toBeUndefined();
  });

  it("makes no Google request with neither runtime OAuth nor an API key", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await fetchGoogleSolarBuildingInsights({ lat: 32.7155, lng: -117.1615 });

    expect(res).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("fetchGoogleBuildingGeometry", () => {
  it("merges Geocoding v4 building outline with Solar API roof pitch when both succeed", async () => {
    const fetchSpy = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("geocode.googleapis.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            destinations: [
              {
                primary: {
                  structureType: "BUILDING",
                  displayPolygon: BUILDING_POLYGON,
                },
                entrances: [{ location: { latitude: 32.71541, longitude: -117.1615 } }],
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          center: { latitude: 32.7155, longitude: -117.1615 },
          solarPotential: {
            buildingStats: { groundAreaMeters2: 140 },
            roofSegmentStats: [
              {
                pitchDegrees: 18.5,
                azimuthDegrees: 90,
                stats: { groundAreaMeters2: 140 },
              },
            ],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const merged = await fetchGoogleBuildingGeometry({
      lat: 32.7155,
      lng: -117.1615,
      apiKey: "test-gmp-key",
      parcelPolygon: PARCEL_POLYGON,
    });

    expect(merged).toMatchObject({
      outlineGeoJson: BUILDING_POLYGON,
      roofPitchDegrees: 18.5,
      roofAzimuthDegrees: 90,
      entranceLatLng: { lat: 32.71541, lng: -117.1615 },
      geometrySource: "google-geocoding-v4",
    });
  });
});
