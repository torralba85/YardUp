// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET as geocode } from "./geocode/route";
import { GET as parcel } from "./parcel/route";
import { requireApiAuth } from "@/lib/server/api-auth";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import { attomResponse } from "@/test/fixtures/attom";

vi.mock("@/lib/server/api-auth", () => ({ requireApiAuth: vi.fn() }));

const QUERY = "123 Oak St, Seattle, WA 98105";
const boundary = { type: "Polygon", coordinates: [[[-122.314, 47.660], [-122.312, 47.660], [-122.312, 47.662], [-122.314, 47.662], [-122.314, 47.660]]] };

function request(route: "geocode" | "parcel", signedIn = true) {
  const url = new URL(`http://localhost/api/${route}`);
  if (route === "geocode") url.searchParams.set("q", QUERY);
  else {
    url.searchParams.set("lat", "47.661"); url.searchParams.set("lng", "-122.313");
    url.searchParams.set("address", QUERY);
  }
  return new NextRequest(url, { headers: signedIn ? { authorization: "Bearer test-token" } : {} });
}

function providerFetch(attomStatus = 200, attom = attomResponse()) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("api.gateway.attomdata.com")) return Response.json(attom, { status: attomStatus });
    if (url.includes("nominatim.openstreetmap.org")) return Response.json([{
      lat: "47.661", lon: "-122.313", display_name: QUERY,
      address: { house_number: "123", road: "Oak St", city: "Seattle", state: "Washington", postcode: "98105" },
    }]);
    if (url.includes("app.regrid.com")) return Response.json({ parcels: { features: [{
      geometry: boundary, properties: { fields: {
        ll_gisacre: 0.1, ll_bldg_footprint_sqft: 1200, saddress: "123 Oak St", scity: "Seattle", state2: "WA", szip: "98105",
      } },
    }] } });
    return Response.json({ features: [], result: { addressMatches: [], geographies: {} } });
  });
}

beforeEach(() => {
  resetRateLimitBuckets();
  vi.stubEnv("ATTOM_API_KEY", "attom-test-key");
  vi.stubEnv("REGRID_API_KEY", "regrid-test-key");
  vi.stubEnv("GOOGLE_GEOCODING_KEY", ""); vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
  vi.mocked(requireApiAuth).mockResolvedValue({ uid: "test-member" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("ATTOM API route integration", () => {
  it("uses the exact ATTOM address before keyless geocoders", async () => {
    const fetchMock = providerFetch(); vi.stubGlobal("fetch", fetchMock);
    const response = await geocode(request("geocode"));
    expect(response.status).toBe(200);
    expect((await response.json()).match.provider).toBe("attom");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requireApiAuth).toHaveBeenCalledTimes(1);
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
  });

  it("preserves a valid Google rooftop result when ATTOM is also configured", async () => {
    vi.stubEnv("GOOGLE_GEOCODING_KEY", "google-test-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [{
      formatted_address: QUERY, types: ["street_address"],
      address_components: [
        { long_name: "123", types: ["street_number"] },
        { long_name: "Oak Street", types: ["route"] },
        { long_name: "Seattle", types: ["locality"] },
        { short_name: "WA", types: ["administrative_area_level_1"] },
        { long_name: "98105", types: ["postal_code"] },
      ],
      geometry: { location: { lat: 47.661, lng: -122.313 }, location_type: "ROOFTOP" },
    }] }));
    vi.stubGlobal("fetch", fetchMock);
    const data = await (await geocode(request("geocode"))).json();
    expect(data.match).toMatchObject({ provider: "google", precision: "rooftop" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain("maps.googleapis.com");
  });

  it.each([403, 429, 500])("keeps geocoding available when ATTOM returns %s", async (status) => {
    vi.stubGlobal("fetch", providerFetch(status));
    const response = await geocode(request("geocode"));
    expect(response.status).toBe(200);
    expect((await response.json()).match.provider).toBe("nominatim");
  });

  it("falls back when ATTOM returns a different street number", async () => {
    const json = attomResponse(); json.property[0].address.line1 = "124 OAK ST";
    vi.stubGlobal("fetch", providerFetch(200, json));
    expect((await (await geocode(request("geocode"))).json()).match.provider).toBe("nominatim");
  });

  it.each(["geocode", "parcel"] as const)("never spends ATTOM quota for guests on /api/%s", async (route) => {
    const fetchMock = providerFetch(); vi.stubGlobal("fetch", fetchMock);
    const response = await (route === "geocode" ? geocode : parcel)(request(route, false));
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("attomdata.com"))).toBe(false);
    expect(requireApiAuth).not.toHaveBeenCalled();
  });

  it.each(["geocode", "parcel"] as const)("rejects forged bearer tokens before ATTOM on /api/%s", async (route) => {
    vi.mocked(requireApiAuth).mockResolvedValue(NextResponse.json({ error: "Invalid authentication token" }, { status: 401 }));
    const fetchMock = providerFetch(); vi.stubGlobal("fetch", fetchMock);
    expect((await (route === "geocode" ? geocode : parcel)(request(route))).status).toBe(200);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("attomdata.com"))).toBe(false);
  });

  it("adds supplemental evidence to autocomplete parcel lookups without replacing GIS facts", async () => {
    vi.stubGlobal("fetch", providerFetch());
    const response = await parcel(request("parcel"));
    const data = await response.json();
    expect(data.source).toBe("regrid");
    expect(data.boundaryGeoJson).toEqual(boundary);
    expect(data.lotArea).toBe(4356);
    expect(data.dataQuality.addressVerification).toMatchObject({ source: { provider: "ATTOM", recordId: "123456" }, confidence: "low" });
    expect(data.dataQuality.providerAttempts).toContainEqual(expect.objectContaining({ provider: "ATTOM", outcome: "matched" }));
    expect(JSON.stringify(data)).not.toMatch(/attom-test-key|DO NOT RETURN OWNER/);
    expect(response.headers.get("cache-control")).toBe("private, max-age=3600");
  });

  it("flags a different parcel without moving its boundary or upgrading its confidence", async () => {
    const json = attomResponse(); json.property[0].location.longitude = "-122.320";
    json.property[0].location.accuracy = "Rooftop";
    vi.stubGlobal("fetch", providerFetch(200, json));
    const data = await (await parcel(request("parcel"))).json();
    expect(data.boundaryGeoJson).toEqual(boundary);
    expect(data.lat).toBe(47.661); expect(data.lng).toBe(-122.313);
    expect(data.dataQuality.fields.address.confidence).toBe("low");
    expect(data.dataQuality.fields.boundaryGeoJson.confidence).toBe("low");
    expect(data.dataQuality.addressVerification.confidence).toBe("low");
    expect(data.dataQuality.warnings).toContainEqual(expect.stringContaining("falls outside"));
  });

  it("does not treat a street-level point outside the parcel as a boundary conflict", async () => {
    const json = attomResponse(); json.property[0].location.longitude = "-122.320";
    vi.stubGlobal("fetch", providerFetch(200, json));
    const data = await (await parcel(request("parcel"))).json();
    expect(data.dataQuality.addressVerification.confidence).toBe("low");
    expect(data.dataQuality.warnings).not.toContainEqual(expect.stringContaining("falls outside"));
  });

  it("retains the parcel and records ATTOM credential failures", async () => {
    vi.stubGlobal("fetch", providerFetch(403));
    const data = await (await parcel(request("parcel"))).json();
    expect(data.source).toBe("regrid");
    expect(data.dataQuality.addressVerification).toBeUndefined();
    expect(data.dataQuality.providerAttempts).toContainEqual(expect.objectContaining({ provider: "ATTOM", outcome: "auth-failed" }));
  });

  it("keeps estimated geometry labeled as a fallback when ATTOM confirms only an address", async () => {
    vi.stubEnv("REGRID_API_KEY", "");
    vi.stubGlobal("fetch", providerFetch());
    const data = await (await parcel(request("parcel"))).json();
    expect(data.source).toBe("fallback");
    expect(data.boundaryGeoJson).toBeNull();
    expect(data.dataQuality.addressVerification.source.provider).toBe("ATTOM");
    expect(data.dataQuality.fields.lotArea.status).toBe("defaulted");
    expect(data.dataQuality.fields.boundaryGeoJson.status).toBe("unavailable");
  });

  it("does not call ATTOM for invalid or rate-limited requests", async () => {
    const fetchMock = providerFetch(); vi.stubGlobal("fetch", fetchMock);
    expect((await geocode(new NextRequest("http://localhost/api/geocode"))).status).toBe(400);
    expect((await parcel(new NextRequest("http://localhost/api/parcel?lat=NaN&lng=0"))).status).toBe(400);
    for (let i = 0; i < 30; i++) await geocode(new NextRequest("http://localhost/api/geocode", { headers: { authorization: "Bearer test-token" } }));
    expect((await geocode(request("geocode"))).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
