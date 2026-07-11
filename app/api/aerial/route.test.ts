import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const LAT = 37.3356039;
const LNG = -121.89849;

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/aerial?lat=${LAT}&lng=${LNG}&w=800&h=540`);
}

// A minimal JPEG header (SOI + APP0 marker) so magic-byte sniffing passes.
const JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

function imageFetchResponse(contentType = "image/jpeg") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": contentType }),
    arrayBuffer: async () => JPEG_BYTES.slice().buffer,
  };
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
    const fetchMock = vi.fn().mockResolvedValue(imageFetchResponse("image/png"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Aerial-Provider")).toBe("google");
    expect(res.headers.get("X-Aerial-Fallback")).toBeNull();
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG_BYTES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("maps.googleapis.com");
  });

  it("falls back to Esri World Imagery when the Maps key is not configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue(imageFetchResponse());
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("X-Aerial-Provider")).toBe("esri");
    expect(res.headers.get("X-Aerial-Attribution")).toContain("Esri");
    expect(res.headers.get("X-Aerial-Fallback")).toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const esriUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(esriUrl.hostname).toBe("server.arcgisonline.com");
    expect(esriUrl.searchParams.get("bboxSR")).toBe("3857");
    expect(esriUrl.searchParams.get("size")).toBe("1600,1080");
    expect(esriUrl.searchParams.get("f")).toBe("image");
  });

  it("requests an Esri bbox matching the Google zoom-19 Web Mercator extent", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue(imageFetchResponse());
    vi.stubGlobal("fetch", fetchMock);

    await GET(makeRequest());

    const esriUrl = new URL(fetchMock.mock.calls[0][0] as string);
    const bbox = (esriUrl.searchParams.get("bbox") ?? "").split(",").map(Number);
    expect(bbox).toHaveLength(4);

    // Independent Web Mercator math: center ± half the image extent at the
    // zoom-19 resolution (meters per CSS pixel).
    const R = 6378137;
    const centerX = (LNG * Math.PI * R) / 180;
    const centerY = Math.log(Math.tan(Math.PI / 4 + (LAT * Math.PI) / 360)) * R;
    const resolution = (2 * Math.PI * R) / 256 / 2 ** 19;
    expect(bbox[0]).toBeCloseTo(centerX - 400 * resolution, 3);
    expect(bbox[1]).toBeCloseTo(centerY - 270 * resolution, 3);
    expect(bbox[2]).toBeCloseTo(centerX + 400 * resolution, 3);
    expect(bbox[3]).toBeCloseTo(centerY + 270 * resolution, 3);
  });

  it("falls back to Esri when Google Maps Static fails", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce(imageFetchResponse());
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aerial-Provider")).toBe("esri");
    expect(res.headers.get("X-Aerial-Fallback")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a non-image Esri response as a failure", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    // ArcGIS reports some errors as HTTP 200 with a JSON/HTML body.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );

    const res = await GET(makeRequest());

    expect(res.headers.get("X-Aerial-Fallback")).toBe("true");
    expect(res.headers.get("X-Aerial-Fallback-Reason")).toBe("unconfigured");
  });

  it("falls back to Esri when Google responds 200 with a non-image body", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
    const fetchMock = vi
      .fn()
      // Maps Static soft error: 2xx with an HTML error page.
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce(imageFetchResponse());
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Aerial-Provider")).toBe("esri");
    expect(res.headers.get("X-Aerial-Fallback")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats an Esri body without image magic bytes as a failure", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    // ArcGIS soft error: image content type, but a JSON body.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () =>
          new TextEncoder().encode('{"error":{"code":500}}').buffer,
      }),
    );

    const res = await GET(makeRequest());

    expect(res.headers.get("X-Aerial-Fallback")).toBe("true");
    expect(res.headers.get("X-Aerial-Fallback-Reason")).toBe("unconfigured");
  });

  it("returns a fallback image instead of a 502 when both providers fail", async () => {
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

  it("returns a non-cacheable fallback image when the Maps key is not configured and Esri fails", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Aerial-Fallback-Reason")).toBe("unconfigured");
  });
});
