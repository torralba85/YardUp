import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { extractRegridLocation } from "@/lib/server/parcel-location";
import type { LiveParcelData } from "@/lib/parcel-types";

/**
 * These tests exercise the GET route handler's Regrid → LiveParcelData
 * transform and its fallback/error paths. lib/parcel-api.test.ts only covers
 * the client fetch; this covers the server-side mapper.
 *
 * IMPORTANT — scope: the mock uses the field NAMES the route currently requests
 * (`address`, `city`, `state`, `zip`, `ll_gisacre`, ...). Those names are
 * ASSUMED, not verified against the live Regrid v2 API. This test proves the
 * transform is correct *given those keys*; it does NOT prove the keys are the
 * ones Regrid actually returns. Confirming the real response schema (and thus
 * that production won't silently fall back) is a separate task — see handoff
 * item #5, which needs a live REGRID_API_KEY.
 */

function makeRequest(lat: number, lng: number, address?: string): NextRequest {
  const url = new URL("http://localhost/api/parcel");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  if (address) url.searchParams.set("address", address);
  return new NextRequest(url);
}

/** A Regrid feature with the fields the route requests. */
function regridResponse(fields: Record<string, unknown>, geometry: unknown = null) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: { features: [{ properties: { fields }, geometry }] },
    }),
  };
}

/**
 * A closed GeoJSON ring for a widthFt × lengthFt rectangle rotated by
 * `degrees`, centered at (latC, lngC). Uses the same latitude-corrected
 * ft-per-degree scales as lib/parcel-geometry so dimensions round-trip.
 */
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
  return { type: "Polygon", coordinates: [ring] };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("REGRID_API_KEY", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/parcel — Regrid field mapping", () => {
  it("maps Regrid fields to LiveParcelData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25, // 0.25 * 43560 = 10890 sq ft
          ll_bldg_footprint_sqft: 1500,
          zoning: "R-1",
          address: "123 Oak St",
          city: "Seattle",
          state: "WA",
          zip: "98105",
        }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("123 Oak St");
    expect(data.city).toBe("Seattle, WA 98105");
    expect(data.lotArea).toBe(10890);
    expect(data.existingHouseSqft).toBe(1500);
    expect(data.zoning).toBe("R-1");
    expect(data.maxLotCoveragePercent).toBe(40); // R-1 → 40%
    // Regrid's standard schema has no setbacks, so these resolve to defaults.
    expect(data.setbacks).toEqual({ front: 20, rear: 20, side: 5 });
    expect(data.lat).toBe(47.65);
    expect(data.lng).toBe(-122.31);
  });

  it("falls back to coordinates when the address field is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.1, zoning: "R-2" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("47.65000, -122.31000");
    expect(data.maxLotCoveragePercent).toBe(45); // R-2 → 45%
  });

  it("uses sqft for footprint when ll_bldg_footprint_sqft is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.2, sqft: 980, zoning: "R-1" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;
    expect(data.existingHouseSqft).toBe(980);
  });

  it("derives oriented (not axis-aligned) dimensions from a rotated parcel polygon", async () => {
    // A 50ft × 100ft lot rotated 30° at Seattle latitude. The old axis-aligned
    // bounding box (with its hardcoded 288000 ft/° longitude scale) inflates
    // this to ~93 × ~112; the oriented bounding box recovers the true 50 × 100.
    const geometry = rotatedRectPolygon(47.65, -122.31, 50, 100, 30);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 5000 / 43560, zoning: "R-1" }, geometry),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.lotWidth).toBeGreaterThanOrEqual(49);
    expect(data.lotWidth).toBeLessThanOrEqual(51);
    expect(data.lotLength).toBeGreaterThanOrEqual(99);
    expect(data.lotLength).toBeLessThanOrEqual(101);
  });

  it("estimates proportional dimensions from lot area when Regrid returns no geometry", async () => {
    // 10890 sq ft with no polygon: the area estimator (~2:1 depth-to-width)
    // gives 74 × 147 — not the old hardcoded 40 ft width (which forced 40 × 272).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.25, zoning: "R-1" }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.lotWidth).toBe(74);
    expect(data.lotLength).toBe(147);
  });

  it("returns a fallback preset (source=fallback) when Regrid has no features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: { features: [] } }),
      }),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("R-1 (estimated)");
  });

  it("returns a fallback when the Regrid fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
  });

  it("keeps the searched address visible when returning fallback estimates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    const res = await GET(
      makeRequest(39.752, -104.999, "456 Pine St, Denver, CO 80202, USA"),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.address).toBe("456 Pine St");
    expect(data.city).toBe("Denver, CO 80202, USA");
  });

  it("uses the searched address when Regrid has no address fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({ ll_gisacre: 0.1, zoning: "R-2" }),
      ),
    );

    const res = await GET(
      makeRequest(37.33, -121.89, "123 Main St, San Jose, CA 95110"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("regrid");
    expect(data.address).toBe("123 Main St");
    expect(data.city).toBe("San Jose, CA 95110");
  });

  it("returns 503 with Retry-After when Regrid rate-limits (429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      }),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("10");
  });

  it("400s when lat/lng are missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/parcel"));
    expect(res.status).toBe(400);
  });

  it("400s when lat/lng are out of range", async () => {
    const res = await GET(makeRequest(200, -122.31));
    expect(res.status).toBe(400);
  });

  it("returns a preset fallback (not 500) when REGRID_API_KEY is unconfigured", async () => {
    // Keyless demo: the route degrades to the nearest sample preset so a
    // geocoded address still resolves to a visible parcel.
    vi.stubEnv("REGRID_API_KEY", "");
    const res = await GET(makeRequest(47.65, -122.31));
    expect(res.status).toBe(200);
    const data = (await res.json()) as LiveParcelData;
    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("R-1 (estimated)");
  });
});

describe("GET /api/parcel — localized market data", () => {
  it("attaches market data resolved from the Regrid location fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        regridResponse({
          ll_gisacre: 0.25,
          zoning: "R-1",
          address: "123 Oak St",
          city: "Seattle",
          state2: "WA",
          szip5: "98107",
          county: "King County",
        }),
      ),
    );

    const res = await GET(makeRequest(47.65, -122.31));
    const data = (await res.json()) as LiveParcelData;

    expect(data.state).toBe("WA");
    expect(data.zip).toBe("98107");
    expect(data.county).toBe("King");
    expect(data.marketData?.source).toBe("hud-zip");
    expect(data.marketData?.rentByBedroom["1br"]).toBe(2050);
  });

  it("resolves fallback-parcel economics from the searched address, not the nearest preset", async () => {
    // A Los Angeles address whose parcel lookup fails must keep California
    // market economics — never inherit an Austin/Seattle preset's numbers.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    const res = await GET(
      makeRequest(34.05, -118.24, "789 Sunset Blvd, Los Angeles, CA 90026, USA"),
    );
    const data = (await res.json()) as LiveParcelData;

    expect(data.source).toBe("fallback");
    expect(data.state).toBe("CA");
    expect(data.marketData?.geography?.state).toBe("CA");
    // CA state-tier rent, not the Austin preset's Texas economics.
    expect(data.marketData?.rentByBedroom["1br"]).toBe(2150);
  });
});

describe("extractRegridLocation", () => {
  it("pulls structured state/zip/county from Regrid fields", () => {
    expect(
      extractRegridLocation({ state2: "WA", szip5: "98107", county: "King County" }),
    ).toEqual({ state: "WA", zip: "98107", county: "King" });
  });

  it("falls back across Regrid field aliases and strips the County suffix", () => {
    expect(
      extractRegridLocation({ state: "OR", zip: "97212", scounty: "Multnomah County" }),
    ).toEqual({ state: "OR", zip: "97212", county: "Multnomah" });
  });

  it("returns empty strings when fields are missing", () => {
    expect(extractRegridLocation({})).toEqual({ state: "", zip: "", county: undefined });
  });
});
