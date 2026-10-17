import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";
import type { LiveParcelData } from "@/lib/parcel-types";
import { GET } from "./route";

/**
 * The Fire Hazard Severity Zone on /api/parcel: every California provider path
 * (paid Regrid, free county/statewide GIS, the preset fallback) carries it,
 * and nothing outside California asks for it.
 */

const TECOLOTE = { lat: 32.788, lng: -117.195 };
const NORTH_PARK = { lat: 32.7484, lng: -117.1302 };
const SEATTLE = { lat: 47.65, lng: -122.31 };

const FIRE_HOSTS = ["webmaps.sandiego.gov", "FHSALRA25_v1_All", "FHSZSRA_23_3"];

function request(point: { lat: number; lng: number }, signedIn = false): NextRequest {
  const url = new URL("http://localhost/api/parcel");
  url.searchParams.set("lat", String(point.lat));
  url.searchParams.set("lng", String(point.lng));
  return new NextRequest(url, signedIn ? { headers: { authorization: "Bearer test-token" } } : {});
}

/** A closed 50 × 120 ft lot ring centred on the point. */
function lotPolygon(point: { lat: number; lng: number }) {
  const dLat = 60 / 364000;
  const dLng = 25 / (364000 * Math.cos((point.lat * Math.PI) / 180));
  const { lat, lng } = point;
  return {
    type: "Polygon" as const,
    coordinates: [[
      [lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat], [lng - dLng, lat - dLat],
    ]],
  };
}

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

const EMPTY = json({ features: [] });
const census = (state: string, county: string) =>
  json({ result: { geographies: { States: [{ STUSAB: state }], Counties: [{ BASENAME: county }] } } });
const parcelHit = (point: { lat: number; lng: number }, county = "San Diego") =>
  json({ features: [{ type: "Feature", geometry: lotPolygon(point), properties: { COUNTYNAME: county } }] });
const fireClass = (attributes: Record<string, unknown>) => json({ features: [{ attributes }] });

interface Providers {
  regrid?: unknown;
  census?: unknown;
  parcels?: unknown;
  city?: unknown;
  lra?: unknown;
  sra?: unknown;
}

function stubProviders(providers: Providers) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    const reply = url.includes("regrid.com")
      ? providers.regrid ?? json({ parcels: { features: [] } })
      : url.includes("geocoding.geo.census.gov")
        ? providers.census ?? census("CA", "San Diego")
        : url.includes("CA_Statewide_Parcels_Public_view") || url.includes("Current_Parcels")
          ? providers.parcels ?? EMPTY
          : url.includes("webmaps.sandiego.gov")
            ? providers.city ?? EMPTY
            : url.includes("FHSALRA25_v1_All")
              ? providers.lra ?? EMPTY
              : url.includes("FHSZSRA_23_3")
                ? providers.sra ?? EMPTY
                : EMPTY;
    if (reply instanceof Error) throw reply;
    return reply;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function fireCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((call) => FIRE_HOSTS.some((host) => String(call[0]).includes(host)));
}

function geometryTypeOf(call: unknown[]): string | null {
  return new URLSearchParams(String((call[1] as RequestInit).body)).get("geometryType");
}

async function lookup(point: { lat: number; lng: number }, signedIn = false): Promise<LiveParcelData> {
  const res = await GET(request(point, signedIn));
  expect(res.status).toBe(200);
  return (await res.json()) as LiveParcelData;
}

beforeEach(() => {
  vi.restoreAllMocks();
  resetRateLimitBuckets();
  vi.stubEnv("REGRID_API_KEY", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/parcel — fire hazard zone", () => {
  it("gives a guest's county GIS parcel its zone from the parcel polygon, without Regrid", async () => {
    const fetchMock = stubProviders({
      parcels: parcelHit(TECOLOTE),
      city: fireClass({ FHSZ_Description: "Very High" }),
      lra: fireClass({ SRA: "LRA", FHSZ: -3, FHSZ_Description: "NonWildland" }),
    });

    const data = await lookup(TECOLOTE);

    expect(data.source).toBe("county-gis");
    expect(data.fireHazard).toEqual({
      zone: "very-high",
      responsibility: "LRA",
      source: "City of San Diego FHSZ map (2025)",
      checkedAt: expect.any(String),
    });
    const calls = fireCalls(fetchMock);
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => geometryTypeOf(call) === "esriGeometryPolygon")).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes("regrid.com"))).toBe(false);
  });

  it("checks a signed-in Regrid parcel against its Regrid polygon", async () => {
    const fetchMock = stubProviders({
      regrid: json({
        parcels: {
          features: [{
            properties: {
              fields: {
                ll_gisacre: 0.14, zoning: "RS-1-7", saddress: "3000 University Ave",
                scity: "San Diego", state2: "CA", szip5: "92104",
              },
            },
            geometry: lotPolygon(NORTH_PARK),
          }],
        },
      }),
      lra: fireClass({ SRA: "LRA", FHSZ: -3, FHSZ_Description: "NonWildland" }),
    });

    const data = await lookup(NORTH_PARK, true);

    expect(data.source).toBe("regrid");
    expect(data.fireHazard).toMatchObject({ zone: "none", responsibility: "LRA" });
    const calls = fireCalls(fetchMock);
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => geometryTypeOf(call) === "esriGeometryPolygon")).toBe(true);
  });

  it("checks the searched point when only the preset fallback answers", async () => {
    const fetchMock = stubProviders({
      sra: fireClass({ SRA: "SRA", FHSZ: 3, FHSZ_Description: "Very High" }),
    });

    const data = await lookup({ lat: 34.07, lng: -118.8 });

    expect(data.source).toBe("fallback");
    expect(data.state).toBe("CA");
    expect(data.fireHazard).toMatchObject({ zone: "very-high", responsibility: "SRA", source: "CAL FIRE SRA FHSZ map (2024)" });
    const calls = fireCalls(fetchMock);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => geometryTypeOf(call) === "esriGeometryPoint")).toBe(true);
  });

  it("still returns the parcel, marked unknown, when the fire maps are down", async () => {
    stubProviders({
      parcels: parcelHit(TECOLOTE),
      city: new TypeError("fetch failed"),
      lra: { ok: false, status: 503, json: async () => ({}) },
      sra: json({ error: { code: 500, message: "Error performing query operation" } }),
    });

    const data = await lookup(TECOLOTE);

    expect(data.source).toBe("county-gis");
    expect(data.lotArea).toBeGreaterThan(0);
    expect(data.fireHazard).toMatchObject({ zone: "unknown" });
    expect(data.fireHazard).not.toHaveProperty("responsibility");
  });

  it("does not ask for a zone outside California", async () => {
    const fetchMock = stubProviders({
      census: census("WA", "King"),
      parcels: parcelHit(SEATTLE, "King"),
    });

    const data = await lookup(SEATTLE);

    expect(data.state).toBe("WA");
    expect(data).not.toHaveProperty("fireHazard");
    expect(fireCalls(fetchMock)).toHaveLength(0);
  });
});
