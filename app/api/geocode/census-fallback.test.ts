import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import { GET } from "./route";

const match = {
  matchedAddress: "1515 GOLD RUSH WAY, OCEANSIDE, CA, 92057",
  coordinates: { x: -117.262469883771, y: 33.250582455181 },
  tigerLine: { tigerLineId: "195700137", side: "R" },
  addressComponents: {
    streetName: "GOLD RUSH", suffixType: "WAY", city: "OCEANSIDE",
    state: "CA", zip: "92057",
  },
};

function stubFreeProviders(matches: unknown[]) {
  const fetchMock = vi.fn(async (input: string) => {
    const host = new URL(String(input)).hostname;
    if (host === "nominatim.openstreetmap.org") {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (host === "geocoding.geo.census.gov") {
      return { ok: true, status: 200, json: async () => ({ result: { addressMatches: matches } }) };
    }
    throw new Error("Unexpected metered provider");
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(query = "1515 Goldrush Way, Oceanside, CA 92057") {
  return new NextRequest(`http://localhost/api/geocode?q=${encodeURIComponent(query)}`);
}

beforeEach(() => {
  resetRateLimitBuckets();
  vi.stubEnv("TYPESAFE_GEOCODE_PICKER", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Census fallback for addresses absent from OpenStreetMap", () => {
  it.each([
    "1515 goldrush way oceanside ca",
    "1515 Goldrush Way, Oceanside, CA",
    "1515 Goldrush Way, Oceanside, CA 92057",
  ])("resolves %s without metered providers and labels interpolation honestly", async (query) => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "configured-but-not-for-guests");
    const fetchMock = stubFreeProviders([match]);
    const response = await GET(request(query));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      lat: match.coordinates.y,
      lng: match.coordinates.x,
      formattedAddress: match.matchedAddress,
      match: {
        provider: "census",
        precision: "range-interpolated",
        partialMatch: false,
        components: { houseNumber: "1515", road: "GOLD RUSH WAY", city: "OCEANSIDE", state: "CA", zip: "92057" },
        evidence: {
          confidence: "medium",
          source: { provider: "US Census Bureau" },
          warnings: [expect.stringMatching(/interpolat/i)],
        },
      },
    });
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).hostname)).toEqual([
      "nominatim.openstreetmap.org",
      "geocoding.geo.census.gov",
    ]);
  });

  it.each([
    { ...match, matchedAddress: "1516 GOLD RUSH WAY, OCEANSIDE, CA, 92057" },
    { ...match, matchedAddress: "1515 GOLDRUN WAY, OCEANSIDE, CA, 92057" },
    { ...match, matchedAddress: "1515 GOLD RUSH WAY, OCEANSIDE, NV, 92057", addressComponents: { ...match.addressComponents, state: "NV" } },
    { ...match, matchedAddress: "1515 GOLD RUSH WAY, OCEANSIDE, CA, 92058", addressComponents: { ...match.addressComponents, zip: "92058" } },
    { ...match, coordinates: { x: -117.26, y: 91 } },
    { ...match, coordinates: { x: "missing", y: 33.25 } },
  ])("rejects a contradictory or invalid Census result: %j", async (candidate) => {
    stubFreeProviders([candidate]);
    expect((await GET(request())).status).toBe(404);
  });

  it("does not choose an arbitrary parcel point from ambiguous Census matches", async () => {
    stubFreeProviders([match, { ...match, coordinates: { x: -117.26, y: 33.26 } }]);
    expect((await GET(request())).status).toBe(404);
  });

  it("keeps returning no match when the free fallback is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (String(input).includes("nominatim.openstreetmap.org")) {
        return { ok: true, status: 200, json: async () => [] };
      }
      throw new Error("Census unavailable");
    }));
    expect((await GET(request())).status).toBe(404);
  });
});
