import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import { GET } from "./route";

/**
 * Exercises the geocode route's provider selection and response mapping.
 * Mirrors app/api/parcel/route.test.ts: fetch is stubbed, so these prove the
 * Google-to-Nominatim selection and the {lat,lng,formattedAddress} transform -
 * not the live provider schemas.
 */

function geocodeUrl(q: string | null): string {
  return q === null
    ? "http://localhost/api/geocode"
    : `http://localhost/api/geocode?q=${encodeURIComponent(q)}`;
}

/** A signed-in caller: carries a bearer token, so paid providers are eligible. */
function makeRequest(q: string | null): NextRequest {
  return new NextRequest(geocodeUrl(q), {
    headers: { authorization: "Bearer test-token" },
  });
}

/** An anonymous caller: no token, so the route must stay on keyless providers. */
function makeGuestRequest(q: string | null): NextRequest {
  return new NextRequest(geocodeUrl(q));
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
  // Guests and members use separate limiter namespaces; clearing keeps a
  // long describe block from tripping either one.
  resetRateLimitBuckets();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/geocode", () => {
  it.each([
    ["202", "C Esplanade", 200],
    ["203", "C Esplanade", 404],
    ["202", "D Esplanade", 404],
  ])("checks structured provider components for an uncommon street type: %s %s", async (houseNumber, road, status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{
      lat: "32.7174385", lon: "-117.1633851", display_name: "California, USA",
      address: { house_number: houseNumber, road, city: "San Diego", state: "California", postcode: "92101" },
    }])));
    expect((await GET(makeGuestRequest("202 C Esplanade, San Diego, CA 92101"))).status).toBe(status);
  });

  it.each(["123 Main St NE", "123 Main St NE, 98115", "123 Main St NE 98115"])("does not mistake the NE postdirectional in %s for a state request", async (query) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{
      lat: "47.6", lon: "-122.3", display_name: "Washington, USA",
      address: { house_number: "123", road: "Main Street NE", city: "Seattle", state: "Washington", postcode: "98115" },
    }])));
    expect((await GET(makeGuestRequest(query))).status).toBe(200);
  });
  it.each([
    "203 C Street San Diego, CA 92101",
    "202 D Street, San Diego CA 92101",
    "202 C Street, San Diego, California 92102",
    "202 C Street San Diego, Nevada 92101",
    "11 Old Court Road Somewhere, CA 92101",
    "10 Old Court Road Somewhere, CA 92102",
  ])("still rejects reliably parsed contradictory components in %s", async (query) => {
    const ambiguous = query.includes("Old Court");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{
      lat: "32.7174385", lon: "-117.1633851", display_name: "California, USA",
      address: {
        house_number: ambiguous ? "10" : "202", road: ambiguous ? "Old Court Road" : "C Street",
        city: ambiguous ? "Somewhere" : "San Diego", state: "California", postcode: "92101",
      },
    }])));
    expect((await GET(makeGuestRequest(query))).status).toBe(404);
  });
  it.each([
    "202 C Street San Diego, CA 92101",
    "202 C Street, San Diego CA 92101",
    "202 C Street, San Diego, California 92101",
    "10 Old Court Road Somewhere, CA 92101",
  ])("accepts a correct provider hit without a false component conflict for %s", async (query) => {
    const ambiguous = query.startsWith("10 ");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{
      lat: "32.7174385", lon: "-117.1633851", type: "house", class: "building",
      display_name: "California, USA",
      address: {
        house_number: ambiguous ? "10" : "202", road: ambiguous ? "Old Court Road" : "C Street",
        city: ambiguous ? "Somewhere" : "San Diego", state: "California", postcode: "92101",
      },
    }])));
    const response = await GET(makeGuestRequest(query));
    expect(response.status).toBe(200);
    const evidence = (await response.json()).match.evidence;
    if (ambiguous) {
      expect(evidence).toMatchObject({ confidence: "low", warnings: [expect.stringContaining("independently parsed")] });
    } else {
      expect(evidence.confidence).not.toBe("low");
    }
  });
  it("checks locality conflicts even when the user omits commas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{ lat: "32.7174385", lon: "-117.1633851", display_name: "California, USA", address: { house_number: "202", road: "C Street", city: "Chula Vista", state: "California", postcode: "92101" } }])));
    const response = await GET(makeGuestRequest("202 C Street San Diego CA 92101"));
    expect(response.status).toBe(200);
    expect((await response.json()).match.evidence.confidence).toBe("low");
  });
  it.each([
    { house_number: "203", road: "C Street", city: "San Diego", state: "California", postcode: "92101" },
    { house_number: "202", road: "D Street", city: "San Diego", state: "California", postcode: "92101" },
    { house_number: "202", road: "C Street", city: "San Diego", state: "California", postcode: "92102" },
  ])("refuses a numbered address with contradictory street or ZIP components", async (address) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{ lat: "32.7174385", lon: "-117.1633851", display_name: "California, USA", address }])));
    expect((await GET(makeGuestRequest("202 C Street, San Diego, CA 92101"))).status).toBe(404);
  });

  it("retains a city conflict as low-confidence evidence for independent parcel checking", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(nominatimResponse([{ lat: "32.7174385", lon: "-117.1633851", display_name: "California, USA", address: { house_number: "202", road: "C Street", city: "Chula Vista", state: "California", postcode: "92101" } }])));
    const response = await GET(makeGuestRequest("202 C Street, San Diego, CA 92101"));
    expect(response.status).toBe(200);
    expect((await response.json()).match.evidence).toMatchObject({ confidence: "low", warnings: [expect.stringContaining("city")] });
  });
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
          place_id: "google-place-123",
          types: ["street_address"],
          partial_match: false,
          address_components: [
            { long_name: "123", short_name: "123", types: ["street_number"] },
            { long_name: "Oak Street", short_name: "Oak St", types: ["route"] },
            { long_name: "Seattle", short_name: "Seattle", types: ["locality"] },
            { long_name: "Washington", short_name: "WA", types: ["administrative_area_level_1"] },
            { long_name: "98105", short_name: "98105", types: ["postal_code"] },
            { long_name: "United States", short_name: "US", types: ["country"] },
          ],
          geometry: {
            location: { lat: 47.661, lng: -122.313 },
            location_type: "ROOFTOP",
          },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("123 Oak St, Seattle"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      lat: 47.661,
      lng: -122.313,
      formattedAddress: "123 Oak St, Seattle, WA 98105, USA",
      match: {
        provider: "google",
        providerId: "google-place-123",
        matchType: "street_address",
        precision: "rooftop",
        partialMatch: false,
        components: {
          houseNumber: "123",
          road: "Oak Street",
          city: "Seattle",
          state: "WA",
          zip: "98105",
          country: "US",
        },
      },
    });
    expect(data.match.evidence.status).toBe("observed");
    expect(data.match.evidence.source.provider).toBe("Google Maps");
    expect(fetchMock.mock.calls[0][0]).toContain("maps.googleapis.com");
  });

  it("rejects a partial Google match for a street address", async () => {
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "g-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        googleResponse([{
          formatted_address: "Oak St, Seattle, WA, USA",
          partial_match: true,
          types: ["route"],
          geometry: {
            location: { lat: 47.661, lng: -122.313 },
            location_type: "GEOMETRIC_CENTER",
          },
        }]),
      )
      .mockResolvedValueOnce(nominatimResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest("123 Oak St, Seattle, WA"));

    expect(res.status).toBe(404);
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

  it("rejects a Nominatim street result without a house number for an address query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([{
          lat: "47.661",
          lon: "-122.313",
          osm_type: "way",
          osm_id: 42,
          type: "residential",
          display_name: "Oak Street, Seattle, Washington, United States",
          address: {
            road: "Oak Street",
            city: "Seattle",
            state: "Washington",
          },
        }]),
      ),
    );

    const res = await GET(makeRequest("123 Oak St, Seattle, WA"));

    expect(res.status).toBe(404);
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

describe("GET /api/geocode — anonymous callers", () => {
  it("never calls paid Google Geocoding without a bearer token", async () => {
    // The whole point of the free first lookup is that it cannot bill: a
    // configured Google key must not be reachable on the anonymous path.
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "g-key");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    const fetchMock = vi.fn().mockResolvedValue(
      nominatimResponse([
        { lat: "47.661", lon: "-122.313", display_name: "123 Oak St, Seattle, Washington" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeGuestRequest("123 Oak St, Seattle, WA"));

    expect(res.status).toBe(200);
    const calledHosts = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledHosts.some((url) => url.includes("maps.googleapis.com"))).toBe(false);
    expect(calledHosts.some((url) => url.includes("nominatim"))).toBe(true);
  });

  it("holds anonymous callers to the tighter guest rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          { lat: "47.661", lon: "-122.313", display_name: "123 Oak St, Seattle, Washington" },
        ]),
      ),
    );

    // The guest window allows 10/min; the 11th must be refused.
    for (let i = 0; i < 10; i += 1) {
      const ok = await GET(makeGuestRequest("123 Oak St, Seattle, WA"));
      expect(ok.status).toBe(200);
    }
    const limited = await GET(makeGuestRequest("123 Oak St, Seattle, WA"));

    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("GET /api/geocode — state matching", () => {
  it("keeps a hit whose state matches the end of the query, not a directional", async () => {
    // Regression: "NE" in a street directional used to be read as Nebraska,
    // which threw away every correct Washington result. Seattle, Portland,
    // Washington DC and Miami all number streets this way.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "47.6920824",
            lon: "-122.3129897",
            display_name:
              "1421, Northeast 88th Street, Maple Leaf, Seattle, King County, Washington, 98115, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("1421 NE 88th St, Seattle, WA"));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lat).toBeCloseTo(47.6920824);
  });

  it("still rejects a hit in a different state from the one asked for", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "39.7",
            lon: "-89.6",
            display_name: "123, Main Street, Springfield, Illinois, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("123 Main St, Springfield, MA"));

    expect(res.status).toBe(404);
  });

  it("reads a trailing state correctly when a directional ends the street", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "38.89",
            lon: "-77.0",
            display_name:
              "1234, Maryland Avenue Northeast, Washington, District of Columbia, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("1234 Maryland Ave NE, Washington, DC"));

    expect(res.status).toBe(200);
  });

  it("matches an address genuinely in Nebraska", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "40.81",
            lon: "-96.7",
            display_name: "123, North Street, Lincoln, Lancaster County, Nebraska, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("123 N St, Lincoln, NE"));

    expect(res.status).toBe(200);
  });

  // Regression: with no trailing state, the last two-letter word anywhere in
  // the query was taken as the state, so a directional or floor number
  // rejected the only (Nominatim) result and guests got a 404.
  it.each([
    [
      "1421 NE 88th St, Seattle",
      "1421, Northeast 88th Street, Maple Leaf, Seattle, King County, Washington, 98115, United States",
    ],
    [
      "2345 NE Alberta St, Portland",
      "2345, Northeast Alberta Street, Concordia, Portland, Multnomah County, Oregon, 97211, United States",
    ],
    [
      "100 Pine St Fl 2, San Francisco",
      "100, Pine Street, Financial District, San Francisco, California, 94111, United States",
    ],
    [
      "500 Grand Ave Oakland in California",
      "500, Grand Avenue, Adams Point, Oakland, Alameda County, California, 94610, United States",
    ],
  ])("keeps a guest hit for %j, which names no state code at its end", async (query, displayName) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([{ lat: "47.6", lon: "-122.3", display_name: displayName }]),
      ),
    );

    const res = await GET(makeGuestRequest(query));

    expect(res.status).toBe(200);
  });

  it("rejects a hit outside a state the query spells out in full", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "45.52",
            lon: "-122.67",
            display_name:
              "88, Main Street, Portland, Multnomah County, Oregon, 97204, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeGuestRequest("88 Main St, Portland, Maine"));

    expect(res.status).toBe(404);
  });

  it("reads the state before a trailing ZIP and country", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "39.7",
            lon: "-89.6",
            display_name: "123, Main Street, Springfield, Illinois, United States",
          },
        ]),
      ),
    );

    const res = await GET(makeGuestRequest("123 Main St, Springfield, MA 01103, USA"));

    expect(res.status).toBe(404);
  });
});

describe("GET /api/geocode — Nominatim address labelling", () => {
  it("returns a conventional US label instead of the raw OSM path", async () => {
    // This string is shown to the visitor as their own address, next to the
    // rent and payback figures they are being asked to trust.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "47.6920824",
            lon: "-122.3129897",
            display_name:
              "1421, Northeast 88th Street, Maple Leaf, Seattle, King County, Washington, 98115, United States",
            osm_type: "way",
            osm_id: 987,
            type: "house",
            address: {
              house_number: "1421",
              road: "Northeast 88th Street",
              suburb: "Maple Leaf",
              city: "Seattle",
              state: "Washington",
              postcode: "98115",
            },
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("1421 NE 88th St, Seattle, WA"));
    const data = await res.json();

    expect(data.formattedAddress).toBe(
      "1421 Northeast 88th Street, Seattle, WA 98115",
    );
    expect(data.match).toMatchObject({
      provider: "nominatim",
      providerId: "way/987",
      matchType: "house",
      precision: "address",
      partialMatch: false,
      components: {
        houseNumber: "1421",
        road: "Northeast 88th Street",
        city: "Seattle",
        state: "WA",
        zip: "98115",
      },
    });
  });

  it("requests structured address details from Nominatim", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      nominatimResponse([
        {
          lat: "47.6",
          lon: "-122.3",
          display_name: "123, Main Street, Seattle, Washington, United States",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await GET(makeRequest("123 Main St, Seattle, WA"));

    expect(String(fetchMock.mock.calls[0][0])).toContain("addressdetails=1");
  });

  it("keeps the raw label when the structured fields are too sparse", async () => {
    const displayName = "Some Place, Seattle, King County, Washington, United States";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "47.6",
            lon: "-122.3",
            display_name: displayName,
            address: { city: "Seattle", state: "Washington" },
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("Some Place, Seattle, WA"));
    const data = await res.json();

    expect(data.formattedAddress).toBe(displayName);
  });

  it("falls back to a town or village when there is no city", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        nominatimResponse([
          {
            lat: "44.0",
            lon: "-72.7",
            display_name: "5, Elm Street, Stowe, Lamoille County, Vermont, 05672, United States",
            address: {
              house_number: "5",
              road: "Elm Street",
              town: "Stowe",
              state: "Vermont",
              postcode: "05672",
            },
          },
        ]),
      ),
    );

    const res = await GET(makeRequest("5 Elm St, Stowe, VT"));
    const data = await res.json();

    expect(data.formattedAddress).toBe("5 Elm Street, Stowe, VT 05672");
  });
});

describe("GET /api/geocode — TypeSafe candidate picker", () => {
  const candidates = [
    {
      lat: "47.70",
      lon: "-122.32",
      display_name: "NE 88th Street, Shoreline, King County, Washington, 98155, United States",
    },
    {
      lat: "47.692",
      lon: "-122.313",
      display_name:
        "1421, Northeast 88th Street, Maple Leaf, Seattle, King County, Washington, 98115, United States",
    },
    {
      lat: "40.8",
      lon: "-96.7",
      display_name: "1421, 88th Street, Lincoln, Lancaster County, Nebraska, United States",
    },
  ];

  /** Routes Nominatim and TypeSafe calls to their own canned responses. */
  function stubProviders(typesafe: () => Promise<unknown>) {
    const fetchMock = vi.fn((url: string) =>
      String(url).includes("api.typesafe.ai") ? typesafe() : Promise.resolve(nominatimResponse(candidates)),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function typesafeChoice(choice: string, confidence: number) {
    return () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          answers: { pick: { type: "choice", choice, confidence, probabilities: {} } },
        }),
      });
  }

  function enablePicker() {
    vi.stubEnv("TYPESAFE_GEOCODE_PICKER", "true");
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
  }

  it("stays on the single best Nominatim guess and never calls TypeSafe while the flag is off", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "ts-key");
    const fetchMock = stubProviders(typesafeChoice("c1", 0.99));

    const res = await GET(makeGuestRequest("1421 NE 88th St, Seattle, WA"));

    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("limit=1");
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("typesafe"))).toBe(false);
  });

  it("asks TypeSafe to choose among in-state candidates and uses its pick", async () => {
    enablePicker();
    const fetchMock = stubProviders(typesafeChoice("c1", 0.95));

    const res = await GET(makeGuestRequest("1421 NE 88th St, Seattle, WA"));

    expect(res.status).toBe(200);
    expect((await res.json()).lat).toBeCloseTo(47.692, 3);
    expect(String(fetchMock.mock.calls[0][0])).toContain("limit=5");

    const typesafeCall = fetchMock.mock.calls.find((call) => String(call[0]).includes("typesafe")) as
      | unknown[]
      | undefined;
    const init = typesafeCall?.[1] as { headers: Record<string, string>; body: string };
    expect(init.headers.Authorization).toBe("Bearer ts-key");
    const body = JSON.parse(init.body);
    expect(body.state).toEqual({ query: "1421 NE 88th St, Seattle, WA" });
    // The Nebraska hit fails the exact state rule, so it is never offered.
    expect(Object.keys(body.questions.pick.criteria)).toEqual(["c0", "c1", "none"]);
  });

  it("404s when TypeSafe is confident none of the candidates is the typed address", async () => {
    enablePicker();
    stubProviders(typesafeChoice("none", 0.9));

    const res = await GET(makeGuestRequest("1421 NE 88th St, Seattle, WA"));

    expect(res.status).toBe(404);
  });

  it("keeps the provider's first candidate when TypeSafe is unsure", async () => {
    enablePicker();
    stubProviders(typesafeChoice("c1", 0.5));

    const res = await GET(makeGuestRequest("1421 NE 88th St, Seattle, WA"));

    expect((await res.json()).lat).toBeCloseTo(47.7, 3);
  });

  it("keeps the provider's first candidate when TypeSafe fails", async () => {
    enablePicker();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stubProviders(() => Promise.resolve({ ok: false, status: 529, json: async () => ({}) }));

    const res = await GET(makeGuestRequest("1421 NE 88th St, Seattle, WA"));

    expect(res.status).toBe(200);
    expect((await res.json()).lat).toBeCloseTo(47.7, 3);
  });
});

describe("GET /api/geocode — secondary unit designators", () => {
  it("sends Nominatim the building address without the unit, which it cannot match", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      nominatimResponse([
        {
          lat: "37.792",
          lon: "-122.399",
          display_name:
            "100, Pine Street, Financial District, San Francisco, California, 94111, United States",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeGuestRequest("100 Pine St Fl 2, San Francisco"));

    expect(res.status).toBe(200);
    const sent = new URL(String(fetchMock.mock.calls[0][0]));
    expect(sent.searchParams.get("q")).toBe("100 Pine St, San Francisco");
  });
});
