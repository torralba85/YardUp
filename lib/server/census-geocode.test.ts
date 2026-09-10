import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCensusLocation } from "./census-geocode";

/**
 * Covers the parsing and endpoint-selection contract of the free US Census
 * geocoder adapter. Response shapes below are trimmed copies of live
 * `Public_AR_Current` / `Current_Current` payloads.
 */

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

/** An `onelineaddress` match — the only endpoint that carries a ZIP. */
function addressMatch(matchedAddress: string, state: string, county: string) {
  return jsonResponse({
    result: {
      addressMatches: [
        {
          matchedAddress,
          geographies: {
            States: [{ STUSAB: state, NAME: "Washington" }],
            Counties: [{ BASENAME: county, NAME: `${county} County` }],
          },
        },
      ],
    },
  });
}

/** A `coordinates` reverse match — state/county only. */
function coordinateMatch(state: string, county: string) {
  return jsonResponse({
    result: {
      geographies: {
        States: [{ STUSAB: state }],
        Counties: [{ BASENAME: county }],
      },
    },
  });
}

const NO_ADDRESS_MATCH = jsonResponse({ result: { addressMatches: [] } });

const SEATTLE = { lat: 47.6806478, lng: -122.3250591 };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCensusLocation — address matches", () => {
  it("returns state, ZIP, and county from a matched address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        addressMatch("1418 NW 65TH ST, SEATTLE, WA, 98117", "WA", "King"),
      ),
    );

    const result = await fetchCensusLocation({
      ...SEATTLE,
      address: "1418 NW 65th St, Seattle, WA",
    });

    expect(result).toEqual({ state: "WA", zip: "98117", county: "King" });
  });

  it("queries the address endpoint with the current benchmark and vintage", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(addressMatch("1 MAIN ST, SEATTLE, WA, 98117", "WA", "King"));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchCensusLocation({ ...SEATTLE, address: "1 Main St" });

    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.pathname).toBe("/geocoder/geographies/onelineaddress");
    expect(url.searchParams.get("address")).toBe("1 Main St");
    expect(url.searchParams.get("benchmark")).toBe("Public_AR_Current");
    expect(url.searchParams.get("vintage")).toBe("Current_Current");
    expect(url.searchParams.get("format")).toBe("json");
  });

  it("strips a County suffix when only NAME is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          result: {
            addressMatches: [
              {
                matchedAddress: "1 MAIN ST, PORTLAND, OR, 97212",
                geographies: {
                  States: [{ STUSAB: "OR" }],
                  Counties: [{ NAME: "Multnomah County" }],
                },
              },
            ],
          },
        }),
      ),
    );

    const result = await fetchCensusLocation({
      lat: 45.54,
      lng: -122.63,
      address: "1 Main St",
    });
    expect(result?.county).toBe("Multnomah");
  });

  it("returns an empty ZIP when the match has no trailing 5-digit field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(addressMatch("1418 NW 65TH ST, SEATTLE, WA", "WA", "King")),
    );

    const result = await fetchCensusLocation({ ...SEATTLE, address: "1418 NW 65th St" });
    expect(result).toEqual({ state: "WA", zip: "", county: "King" });
  });
});

describe("fetchCensusLocation — coordinate fallback", () => {
  it("falls back to the coordinate endpoint when the address does not match", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(NO_ADDRESS_MATCH)
      .mockResolvedValueOnce(coordinateMatch("WA", "King"));
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchCensusLocation({ ...SEATTLE, address: "nowhere at all" });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const second = new URL(String(fetchSpy.mock.calls[1][0]));
    expect(second.pathname).toBe("/geocoder/geographies/coordinates");
    expect(second.searchParams.get("x")).toBe(String(SEATTLE.lng));
    expect(second.searchParams.get("y")).toBe(String(SEATTLE.lat));
    // The coordinate endpoint never returns a ZIP.
    expect(result).toEqual({ state: "WA", zip: "", county: "King" });
  });

  it("uses the coordinate endpoint directly when no address is supplied", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(coordinateMatch("WA", "King"));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchCensusLocation(SEATTLE);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(new URL(String(fetchSpy.mock.calls[0][0])).pathname).toBe(
      "/geocoder/geographies/coordinates",
    );
  });

  it("returns a state without a county when the county layer is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ result: { geographies: { States: [{ STUSAB: "WA" }] } } }),
      ),
    );
    expect(await fetchCensusLocation(SEATTLE)).toEqual({
      state: "WA",
      zip: "",
      county: undefined,
    });
  });
});

describe("fetchCensusLocation — failure modes (must all return null, never throw)", () => {
  it("returns null when the geocoder is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    expect(await fetchCensusLocation(SEATTLE)).toBeNull();
  });

  it("returns null on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await fetchCensusLocation(SEATTLE)).toBeNull();
  });

  it("returns null on a malformed JSON body", async () => {
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
    expect(await fetchCensusLocation(SEATTLE)).toBeNull();
  });

  it("returns null when the payload carries no state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ result: { geographies: { Counties: [{ BASENAME: "King" }] } } }),
      ),
    );
    expect(await fetchCensusLocation(SEATTLE)).toBeNull();
  });

  it("returns null on an unexpected payload shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ parcels: {} })));
    expect(await fetchCensusLocation(SEATTLE)).toBeNull();
  });
});
