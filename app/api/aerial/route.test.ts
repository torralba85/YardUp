import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/aerial?lat=37.3356039&lng=-121.89849&w=800&h=540");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/aerial", () => {
  it("returns proxied image bytes when Google Maps Static succeeds", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Aerial-Fallback")).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("returns a fallback image instead of a 502 when Google Maps Static fails", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      }),
    );

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(res.headers.get("X-Aerial-Fallback")).toBe("true");
    expect(res.headers.get("X-Aerial-Fallback-Reason")).toBe("upstream");
    expect(await res.text()).toContain("Aerial imagery unavailable");
  });

  it("returns a non-cacheable fallback image when the Maps key is not configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Aerial-Fallback-Reason")).toBe("unconfigured");
  });
});
