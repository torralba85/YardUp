import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

/**
 * Exercises the geocode route's provider selection and response mapping.
 * Mirrors app/api/parcel/route.test.ts: fetch is stubbed, so these prove the
 * Google-to-Nominatim selection and the {lat,lng,formattedAddress} transform -
 * not the live provider schemas.
 */

function makeRequest(q: string | null): NextRequest {
  const url = q === null
    ? "http://localhost/api/geocode"
    : `http://localhost/api/geocode?q=${encodeURIComponent(q)}`;
  return new NextRequest(url);
}

function googleResponse(results: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ status: results.length ? "OK" : "ZERO_RESULTS", results }),
  };
}

function nominatimResponse(results: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => results,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/geocode", () => {
  it("400s when q is missing or blank", async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(400);
    const blank = await GET(makeRequest("   "));
    expect(blank.status).toBe(400);
  });

  it("uses Google Geocoding when GOOGLE_GEOCODING_KEY is set", async () => {
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "g-key");
    const fetchMock = vi.fn().mockResolvedValue(
      googleResponse([
        {
          formatted_address: "123 Oak St, Seattle, WA 98105, USA",
          geometry: { location: { lat: 47.661, lng: -122.313 } },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("123 Oak St, Seattle"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      lat: 47.661,
      lng: -122.313,
      formattedAddress: "123 Oak St, Seattle, WA 98105, USA",
    });
    expect(fetchMock.mock.calls[0][0]).toContain("maps.googleapis.com");
  });

  it("uses the documented GOOGLE_MAPS_API_KEY for Google Geocoding", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    const fetchMock = vi.fn().mockResolvedValue(
      googleResponse([
        {
          formatted_address: "456 Pine St, Denver, CO 80202, USA",
          geometry: { location: { lat: 39.752, lng: -104.999 } },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("456 Pine St, Denver"));
    expect(res.status).toBe(200);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain("maps.googleapis.com");
    expect(calledUrl).toContain("key=maps-key");
  });

  it("falls back to Nominatim when no Google key is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      nominatimResponse([
        { lat: "45.523", lon: "-122.676", display_name: "Portland, OR, USA" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("Portland"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lat).toBeCloseTo(45.523, 3);
    expect(data.lng).toBeCloseTo(-122.676, 3);
    expect(data.formattedAddress).toBe("Portland, OR, USA");
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain("nominatim.openstreetmap.org");
    // Nominatim policy requires a User-Agent.
    expect((init?.headers as Record<string, string>)["User-Agent"]).toBeTruthy();
  });

  it("404s when the provider returns no match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([])));
    const res = await GET(makeRequest("asldkfjqwoeiruzzz"));
    expect(res.status).toBe(404);
  });

  it("rejects keyless fallback matches outside the requested state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "40.235",
            lon: "-76.136",
            display_name:
              "456, Pine Street, Denver, Lancaster County, Pennsylvania, 17517, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("456 Pine St, Denver, CO"));
    expect(res.status).toBe(404);
  });

  it("falls back to Nominatim when Google returns ZERO_RESULTS", async () => {
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "g-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(googleResponse([]))
      .mockResolvedValueOnce(
        nominatimResponse([
          { lat: "30.267", lon: "-97.743", display_name: "Austin, TX, USA" },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("Austin"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.formattedAddress).toBe("Austin, TX, USA");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("404s when both providers fail to resolve", async () => {
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "g-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );
    const res = await GET(makeRequest("anywhere"));
    expect(res.status).toBe(404);
  });
});
