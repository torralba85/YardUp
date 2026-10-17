import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoJsonPolygon } from "@/lib/parcel-types";
import { FIRE_HAZARD_LAYERS, fetchFireHazardZone } from "./fire-hazard-zones";

// Points verified against the live layers on 2026-10-16.
const TECOLOTE = { lat: 32.788, lng: -117.195 }; // City Very High; CAL FIRE NonWildland
const NORTH_PARK = { lat: 32.7484, lng: -117.1302 }; // no zone on any map
const SAN_JOSE = { lat: 37.335, lng: -121.889 }; // outside the City of San Diego's extent

const CITY = "webmaps.sandiego.gov";
const LRA = "FHSALRA25_v1_All";
const SRA = "FHSZSRA_23_3";

type Reply = unknown | Error | typeof HANG;
const HANG = Symbol("hang");

function esriFeatures(...attributes: Array<Record<string, unknown>>) {
  return { ok: true, status: 200, json: async () => ({ features: attributes.map((a) => ({ attributes: a })) }) };
}
const NO_FEATURES = esriFeatures();
const NON_WILDLAND = esriFeatures({ SRA: "LRA", FHSZ: -3, FHSZ_Description: "NonWildland" });
const CITY_VERY_HIGH = esriFeatures({ FHSZ_Description: "Very High" });

/** Answer each layer by its URL; unlisted layers answer with no features. */
function stubLayers(replies: { city?: Reply; lra?: Reply; sra?: Reply }) {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const reply = url.includes(CITY)
      ? replies.city
      : url.includes(LRA)
        ? replies.lra
        : url.includes(SRA)
          ? replies.sra
          : undefined;
    if (reply instanceof Error) throw reply;
    if (reply === HANG) {
      return await new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    }
    return reply ?? NO_FEATURES;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function bodyOf(call: unknown[]): URLSearchParams {
  const init = call[1] as RequestInit;
  return new URLSearchParams(String(init.body));
}

function callTo(fetchMock: ReturnType<typeof vi.fn>, marker: string): unknown[] | undefined {
  return fetchMock.mock.calls.find((call) => String(call[0]).includes(marker));
}

/** A counter-clockwise (GeoJSON-convention) lot ring with one hole. */
function lot(lat: number, lng: number): GeoJsonPolygon {
  const d = 0.0002;
  return {
    type: "Polygon",
    coordinates: [
      [[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]],
      [[lng - d / 4, lat - d / 4], [lng - d / 4, lat + d / 4], [lng + d / 4, lat + d / 4], [lng - d / 4, lat - d / 4]],
    ],
  };
}

/** Shoelace sum; negative means clockwise in lng/lat axes. */
function twiceSignedArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return sum;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchFireHazardZone — scope", () => {
  it("does not look up parcels outside California", async () => {
    const fetchMock = stubLayers({});
    expect(await fetchFireHazardZone({ ...TECOLOTE, state: "WA" })).toBeNull();
    expect(await fetchFireHazardZone({ ...TECOLOTE, state: "" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the City's map only inside its extent", async () => {
    const sanDiego = stubLayers({});
    await fetchFireHazardZone({ ...NORTH_PARK, state: "CA" });
    expect(sanDiego.mock.calls.map((call) => String(call[0]))).toEqual(FIRE_HAZARD_LAYERS.map((layer) => layer.queryUrl));

    const elsewhere = stubLayers({});
    await fetchFireHazardZone({ ...SAN_JOSE, state: "ca" });
    expect(elsewhere.mock.calls.map((call) => String(call[0])).some((url) => url.includes(CITY))).toBe(false);
    expect(elsewhere).toHaveBeenCalledTimes(2);
  });

  it("posts an intersects query for the point, with only the class attributes", async () => {
    const fetchMock = stubLayers({});
    await fetchFireHazardZone({ ...TECOLOTE, state: "CA" });

    for (const layer of FIRE_HAZARD_LAYERS) {
      const call = callTo(fetchMock, layer.queryUrl)!;
      expect((call[1] as RequestInit).method).toBe("POST");
      const body = bodyOf(call);
      expect(body.get("f")).toBe("json");
      expect(body.get("geometryType")).toBe("esriGeometryPoint");
      expect(JSON.parse(body.get("geometry")!)).toEqual({ x: TECOLOTE.lng, y: TECOLOTE.lat, spatialReference: { wkid: 4326 } });
      expect(body.get("inSR")).toBe("4326");
      expect(body.get("spatialRel")).toBe("esriSpatialRelIntersects");
      expect(body.get("returnGeometry")).toBe("false");
      expect(body.get("outFields")).toBe(layer.outFields);
      expect(body.get("outFields")).not.toContain("*");
    }
  });

  it("queries the parcel's exterior ring, turned clockwise for Esri, when one is known", async () => {
    const fetchMock = stubLayers({});
    const polygon = lot(TECOLOTE.lat, TECOLOTE.lng);
    expect(twiceSignedArea(polygon.coordinates[0])).toBeGreaterThan(0);

    await fetchFireHazardZone({ ...TECOLOTE, state: "CA", polygon });

    const body = bodyOf(callTo(fetchMock, LRA)!);
    expect(body.get("geometryType")).toBe("esriGeometryPolygon");
    const geometry = JSON.parse(body.get("geometry")!) as { rings: number[][][]; spatialReference: unknown };
    expect(geometry.spatialReference).toEqual({ wkid: 4326 });
    expect(geometry.rings).toHaveLength(1);
    expect(twiceSignedArea(geometry.rings[0])).toBeLessThan(0);
    expect([...geometry.rings[0]].reverse()).toEqual(polygon.coordinates[0]);
  });

  it("closes an open ring and falls back to the point for an unusable one", async () => {
    const open = stubLayers({});
    const { lat, lng } = TECOLOTE;
    await fetchFireHazardZone({
      lat, lng, state: "CA",
      polygon: { type: "Polygon", coordinates: [[[lng, lat], [lng, lat + 0.001], [lng + 0.001, lat + 0.001]]] },
    });
    const ring = (JSON.parse(bodyOf(callTo(open, LRA)!).get("geometry")!) as { rings: number[][][] }).rings[0];
    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[3]);

    for (const polygon of [
      { type: "Polygon", coordinates: [] },
      { type: "Polygon", coordinates: [[[lng, lat], [lng, lat], [lng, lat], [lng, lat]]] },
      { type: "Polygon", coordinates: [[[Number.NaN, lat], ["x", lat], [lng]]] },
    ] as unknown as GeoJsonPolygon[]) {
      const fetchMock = stubLayers({});
      await fetchFireHazardZone({ lat, lng, state: "CA", polygon });
      expect(bodyOf(callTo(fetchMock, LRA)!).get("geometryType")).toBe("esriGeometryPoint");
    }
  });
});

describe("fetchFireHazardZone — classes", () => {
  it("takes the City's Very High over CAL FIRE's NonWildland", async () => {
    stubLayers({ city: CITY_VERY_HIGH, lra: NON_WILDLAND });
    expect(await fetchFireHazardZone({ ...TECOLOTE, state: "CA" })).toEqual({
      zone: "very-high",
      responsibility: "LRA",
      source: "City of San Diego FHSZ map (2025)",
      checkedAt: expect.any(String),
    });
  });

  it("reads CAL FIRE's numeric class and responsibility area", async () => {
    stubLayers({ sra: esriFeatures({ SRA: "SRA", FHSZ: 3, FHSZ_Description: "Very High" }) });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({
      zone: "very-high",
      responsibility: "SRA",
      source: "CAL FIRE SRA FHSZ map (2024)",
    });
  });

  it("lets the highest class win across a parcel's features", async () => {
    stubLayers({
      lra: esriFeatures(
        { SRA: "LRA", FHSZ: 1, FHSZ_Description: "Moderate" },
        { SRA: "LRA", FHSZ: 2, FHSZ_Description: "High" },
        { SRA: "LRA", FHSZ: -3, FHSZ_Description: "NonWildland" },
      ),
    });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "high", responsibility: "LRA" });
  });

  it("falls back to the description when the code is missing", async () => {
    stubLayers({ lra: esriFeatures({ FHSZ_Description: "High" }) });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "high", responsibility: "LRA" });
  });

  it("names the one map behind a Moderate zone", async () => {
    stubLayers({ lra: esriFeatures({ SRA: "LRA", FHSZ: 1, FHSZ_Description: "Moderate" }) });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({
      zone: "moderate",
      source: "CAL FIRE LRA FHSZ map (2025)",
    });
  });

  it("reports none, naming every map, when all of them answer outside a zone", async () => {
    stubLayers({ lra: NON_WILDLAND });
    expect(await fetchFireHazardZone({ ...NORTH_PARK, state: "CA" })).toEqual({
      zone: "none",
      responsibility: "LRA",
      source: "City of San Diego FHSZ map (2025), CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)",
      checkedAt: expect.any(String),
    });
  });

  it("reports none without a responsibility area when no map has a polygon there", async () => {
    stubLayers({});
    const result = await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" });
    expect(result).toMatchObject({ zone: "none", source: "CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)" });
    expect(result).not.toHaveProperty("responsibility");
    expect(Number.isNaN(Date.parse(result!.checkedAt))).toBe(false);
  });
});

describe("fetchFireHazardZone — failures", () => {
  it("turns a timeout into unknown, never none", async () => {
    vi.useFakeTimers();
    stubLayers({ city: HANG, lra: NON_WILDLAND });
    const pending = fetchFireHazardZone({ ...NORTH_PARK, state: "CA" });
    await vi.advanceTimersByTimeAsync(3500);
    expect(await pending).toMatchObject({ zone: "unknown" });
    expect(await pending).not.toHaveProperty("responsibility");
  });

  it("keeps a Very High answer when another map times out", async () => {
    vi.useFakeTimers();
    stubLayers({ city: CITY_VERY_HIGH, lra: HANG, sra: HANG });
    const pending = fetchFireHazardZone({ ...TECOLOTE, state: "CA" });
    await vi.advanceTimersByTimeAsync(3500);
    expect(await pending).toMatchObject({ zone: "very-high", source: "City of San Diego FHSZ map (2025)" });
  });

  it("keeps a Moderate answer unknown when another map failed", async () => {
    stubLayers({ lra: esriFeatures({ SRA: "LRA", FHSZ: 1 }), sra: new TypeError("fetch failed") });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "unknown" });
  });

  it.each([
    ["an HTTP error", { ok: false, status: 503, json: async () => ({}) }],
    ["an ArcGIS error body", { ok: true, status: 200, json: async () => ({ error: { code: 400, message: "Invalid query" } }) }],
    ["a body without a feature list", { ok: true, status: 200, json: async () => ({ features: "none" }) }],
    ["a null body", { ok: true, status: 200, json: async () => null }],
    ["a body that is not JSON", { ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } }],
    ["features with no readable class", esriFeatures({ OBJECTID: 7 }, { FHSZ: 9, FHSZ_Description: "Extreme" })],
    ["features that are not objects", { ok: true, status: 200, json: async () => ({ features: [null, 4, "x"] }) }],
    ["a truncated result below the top class", { ok: true, status: 200, json: async () => ({ features: [{ attributes: { FHSZ: 2 } }], exceededTransferLimit: true }) }],
    ["a network error", new TypeError("fetch failed")],
  ])("turns %s into unknown", async (_label, reply) => {
    stubLayers({ lra: reply });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({
      zone: "unknown",
      source: "CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)",
    });
  });

  it.each([
    ["NonWildland", { SRA: "LRA", FHSZ: -3, FHSZ_Description: "NonWildland" }],
    ["Moderate", { SRA: "LRA", FHSZ: 1 }],
    ["High", { SRA: "LRA", FHSZ: 2 }],
  ])("turns a %s feature beside an unreadable one into unknown, never a clear answer", async (_label, readable) => {
    stubLayers({ lra: esriFeatures(readable, { OBJECTID: 7 }) });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({
      zone: "unknown",
      source: "CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)",
    });
  });

  it("does not let another map's clear answer vouch for a layer with an unreadable feature", async () => {
    stubLayers({ city: esriFeatures({ FHSZ_Description: "Moderate" }, { OBJECTID: 3 }), lra: NON_WILDLAND });
    expect(await fetchFireHazardZone({ ...TECOLOTE, state: "CA" })).toMatchObject({ zone: "unknown" });
  });

  it("keeps a Very High feature even when another feature in the same layer is unreadable", async () => {
    stubLayers({ lra: esriFeatures({ OBJECTID: 7 }, { SRA: "LRA", FHSZ: 3 }) });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "very-high", responsibility: "LRA" });
  });

  it("accepts a truncated result that already holds Very High", async () => {
    stubLayers({ lra: { ok: true, status: 200, json: async () => ({ features: [{ attributes: { FHSZ: 3 } }], exceededTransferLimit: true }) } });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "very-high" });
  });

  it("reads GeoJSON-style properties as well as Esri attributes", async () => {
    stubLayers({ lra: { ok: true, status: 200, json: async () => ({ features: [{ properties: { SRA: "LRA", FHSZ: "2" } }] }) } });
    expect(await fetchFireHazardZone({ ...SAN_JOSE, state: "CA" })).toMatchObject({ zone: "high", responsibility: "LRA" });
  });

  it("returns unknown without a request for unusable coordinates", async () => {
    const fetchMock = stubLayers({});
    expect(await fetchFireHazardZone({ lat: Number.NaN, lng: -117.1, state: "CA" })).toMatchObject({ zone: "unknown" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
