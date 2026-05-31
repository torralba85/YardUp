import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

describe("GET /api/parcel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("REGRID_API_KEY", "mock-regrid-api-token");
  });

  const createRequest = (lat: string | number, lng: string | number) => {
    return new NextRequest(`http://localhost/api/parcel?lat=${lat}&lng=${lng}`);
  };

  it("returns 400 if lat or lng is missing", async () => {
    const req = new NextRequest("http://localhost/api/parcel?lat=47.65");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 if coordinates are out of bounds", async () => {
    const req = createRequest(95, -122.31);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/range/i);
  });

  it("returns 500 if REGRID_API_KEY is not configured", async () => {
    vi.unstubAllEnvs(); // Clear the env stub
    const req = createRequest(47.65, -122.31);
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/configured/i);
  });

  it("returns mapped LiveParcelData on successful Regrid query with standard Situs fields", async () => {
    const mockRegridPayload = {
      results: {
        features: [
          {
            properties: {
              fields: {
                ll_gisacre: 0.15,
                ll_bldg_footprint_sqft: 1800,
                sqft: 1800,
                zoning: "R1",
                saddress: "123 Situs Ave",
                scity: "Seattle",
                state2: "WA",
                szip5: "98105",
              },
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-122.311, 47.651],
                  [-122.309, 47.651],
                  [-122.309, 47.649],
                  [-122.311, 47.649],
                  [-122.311, 47.651],
                ],
              ],
            },
          },
        ],
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRegridPayload,
      }),
    );

    const req = createRequest(47.65, -122.31);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBe("regrid");
    expect(data.address).toBe("123 Situs Ave");
    expect(data.city).toBe("Seattle, WA 98105");
    expect(data.lotArea).toBe(Math.round(0.15 * 43560));
    expect(data.existingHouseSqft).toBe(1800);
    expect(data.zoning).toBe("R1");
    expect(data.maxLotCoveragePercent).toBe(40);
  });

  it("falls back to address/city/state/zip if saddress/scity/state2/szip5 are missing", async () => {
    const mockRegridPayload = {
      results: {
        features: [
          {
            properties: {
              fields: {
                ll_gisacre: 0.20,
                ll_bldg_footprint_sqft: 1200,
                zoning: "R-2",
                address: "456 Fallback St",
                city: "Seattle",
                state: "WA",
                zip: "98103",
              },
            },
            geometry: null,
          },
        ],
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRegridPayload,
      }),
    );

    const req = createRequest(47.65, -122.31);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBe("regrid");
    expect(data.address).toBe("456 Fallback St");
    expect(data.city).toBe("Seattle, WA 98103");
    expect(data.zoning).toBe("R-2");
    expect(data.maxLotCoveragePercent).toBe(45);
  });

  it("returns preset fallback data if Regrid returns empty results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: { features: [] } }),
      }),
    );

    const req = createRequest(47.68, -122.29); // near Seattle preset
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBe("fallback");
    expect(data.zoning).toBe("R-1 (estimated)");
    expect(data.city).toContain("Seattle");
  });

  it("returns preset fallback data if Regrid query fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("API offline")),
    );

    const req = createRequest(30.25, -97.75); // near Austin preset
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBe("fallback");
    expect(data.city).toContain("Austin");
  });

  it("returns 503 if Regrid returns 429 rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    const req = createRequest(47.65, -122.31);
    const res = await GET(req);
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("10");
  });
});
