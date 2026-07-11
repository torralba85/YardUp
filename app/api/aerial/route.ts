import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const MAPS_STATIC_API = "https://maps.googleapis.com/maps/api/staticmap";
const ESRI_EXPORT_API =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export";
const ESRI_ATTRIBUTION =
  "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const TIMEOUT_MS = 5000;

/** Zoom level for the parcel view; AerialView's overlay projection assumes it. */
const ZOOM = 19;
/** Retina factor; matches AerialView's SCALE and Google's scale=2. */
const SCALE = 2;
/** WGS84 / Web Mercator (EPSG:3857) equatorial radius in meters. */
const EARTH_RADIUS_M = 6378137;
/** Web Mercator breaks down at the poles; clamp like the client projection. */
const MAX_MERCATOR_LAT = 85.05112878;

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

interface AerialImage {
  buffer: ArrayBuffer;
  contentType: string;
}

function aerialFallbackResponse(reason: "unconfigured" | "upstream") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 540" role="img" aria-label="Aerial imagery unavailable">
  <defs>
    <linearGradient id="ground" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#2f4a38"/>
      <stop offset="0.58" stop-color="#4d5a3f"/>
      <stop offset="1" stop-color="#8b6f47"/>
    </linearGradient>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0H0v64" fill="none" stroke="#efe3c733" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="540" fill="url(#ground)"/>
  <rect width="800" height="540" fill="url(#grid)"/>
  <path d="M0 390c96-38 158-46 255-21 83 22 153 15 245-24 104-43 191-39 300 9v186H0z" fill="#1f322866"/>
  <path d="M56 114 245 58l218 40 292-66" fill="none" stroke="#efe3c744" stroke-width="18" stroke-linecap="round"/>
  <path d="M78 352 272 270l172 34 280-94" fill="none" stroke="#efe3c744" stroke-width="14" stroke-linecap="round"/>
  <rect x="252" y="214" width="296" height="112" rx="8" fill="#120f0bcc"/>
  <text x="400" y="258" text-anchor="middle" fill="#f5efe2" font-family="Arial, sans-serif" font-size="22" font-weight="700">Aerial imagery unavailable</text>
  <text x="400" y="290" text-anchor="middle" fill="#d9c9a5" font-family="Arial, sans-serif" font-size="15">Showing parcel overlay without satellite base.</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": reason === "unconfigured"
        ? "no-store"
        : "private, max-age=300, stale-while-revalidate=86400",
      "X-Aerial-Fallback": "true",
      "X-Aerial-Fallback-Reason": reason,
    },
  });
}

function imageResponse(
  image: AerialImage,
  provider: "google" | "esri",
  attribution?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": image.contentType,
    "Cache-Control": "private, max-age=86400",
    "X-Aerial-Provider": provider,
  };
  if (attribution) headers["X-Aerial-Attribution"] = attribution;
  return new NextResponse(image.buffer, { status: 200, headers });
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a provider response body, accepting it only when both the content type
 * and the leading magic bytes identify a raster image. Providers can report
 * errors as 2xx responses with JSON/HTML bodies; those must fail so the next
 * provider in the chain gets a chance.
 */
async function readImageBody(
  res: Response,
  provider: string,
): Promise<AerialImage | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    console.warn(`[/api/aerial] ${provider} returned non-image: ${contentType}`);
    return null;
  }
  const buffer = await res.arrayBuffer();
  if (!looksLikeRasterImage(buffer)) {
    console.warn(`[/api/aerial] ${provider} body is not a valid raster image`);
    return null;
  }
  return { buffer, contentType };
}

async function fetchGoogleStatic(
  lat: number,
  lng: number,
  w: number,
  h: number,
  mapsKey: string,
): Promise<AerialImage | null> {
  const url = new URL(MAPS_STATIC_API);
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", String(ZOOM));
  url.searchParams.set("size", `${w}x${h}`);
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("scale", String(SCALE)); // retina
  url.searchParams.set("key", mapsKey);

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) {
      console.warn(`[/api/aerial] Maps Static returned ${res.status}`);
      return null;
    }
    return await readImageBody(res, "Maps Static");
  } catch (err) {
    console.warn("[/api/aerial] Maps Static fetch failed:", err);
    return null;
  }
}

/**
 * Web Mercator (EPSG:3857) bbox covering the same ground extent as a Google
 * Static Maps image centered on lat/lng at {@link ZOOM}. Both providers use
 * the standard 256px tile pyramid, so an Esri export of this bbox at
 * `w*SCALE x h*SCALE` pixels is pixel-equivalent to the Google view — which
 * keeps AerialView's latLngToPixel overlay projection accurate.
 */
function mercatorBbox(lat: number, lng: number, w: number, h: number): string {
  const clampedLat = Math.min(Math.max(lat, -MAX_MERCATOR_LAT), MAX_MERCATOR_LAT);
  const x = (lng * Math.PI * EARTH_RADIUS_M) / 180;
  const y =
    Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360)) *
    EARTH_RADIUS_M;
  // Meters per CSS pixel at this zoom in Mercator units.
  const resolution = (2 * Math.PI * EARTH_RADIUS_M) / 256 / 2 ** ZOOM;
  const halfW = (w / 2) * resolution;
  const halfH = (h / 2) * resolution;
  return [x - halfW, y - halfH, x + halfW, y + halfH]
    .map((v) => v.toFixed(4))
    .join(",");
}

/**
 * True when the payload starts with a known raster magic number (JPEG, PNG,
 * GIF, or WebP). ArcGIS can serve soft errors with an image content type, so
 * the header alone is not enough to trust the body.
 */
function looksLikeRasterImage(buffer: ArrayBuffer): boolean {
  const b = new Uint8Array(buffer);
  if (b.length < 12) return false;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true; // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true; // PNG
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true; // GIF
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return true; // WebP (RIFF....WEBP)
  }
  return false;
}

/**
 * Keyless satellite fallback: Esri World Imagery "Export Map". Used when
 * GOOGLE_MAPS_API_KEY is missing or Maps Static fails, so production still
 * renders a real aerial base. Requires attribution (surfaced via the
 * X-Aerial-Attribution header and rendered by AerialView).
 */
async function fetchEsriExport(
  lat: number,
  lng: number,
  w: number,
  h: number,
): Promise<AerialImage | null> {
  const url = new URL(ESRI_EXPORT_API);
  url.searchParams.set("bbox", mercatorBbox(lat, lng, w, h));
  url.searchParams.set("bboxSR", "3857");
  url.searchParams.set("imageSR", "3857");
  url.searchParams.set("size", `${w * SCALE},${h * SCALE}`);
  url.searchParams.set("format", "jpg");
  url.searchParams.set("f", "image");

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) {
      console.warn(`[/api/aerial] Esri export returned ${res.status}`);
      return null;
    }
    return await readImageBody(res, "Esri export");
  } catch (err) {
    console.warn("[/api/aerial] Esri export fetch failed:", err);
    return null;
  }
}

/**
 * GET /api/aerial?lat={lat}&lng={lng}&w={width}&h={height}
 *
 * Returns a satellite image centered on the parcel. Tries Google Maps Static
 * first (proxied server-side so GOOGLE_MAPS_API_KEY is never exposed to the
 * browser), then falls back to the keyless Esri World Imagery export, and
 * only serves the SVG placeholder when both providers fail. Raw image bytes
 * are returned with the correct Content-Type; X-Aerial-Provider identifies
 * the source.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wStr = searchParams.get("w") ?? "800";
  const hStr = searchParams.get("h") ?? "540";

  const limited = checkRateLimit(request, {
    limit: 120,
    namespace: "aerial",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const coordinates = parseCoordinateParams(searchParams);
  if (coordinates instanceof NextResponse) return coordinates;
  const { lat, lng } = coordinates;

  const w = Math.min(Math.max(parseInt(wStr, 10) || 800, 100), 1280);
  const h = Math.min(Math.max(parseInt(hStr, 10) || 540, 100), 1280);

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    const googleImage = await fetchGoogleStatic(lat, lng, w, h, mapsKey);
    if (googleImage) return imageResponse(googleImage, "google");
  }

  const esriImage = await fetchEsriExport(lat, lng, w, h);
  if (esriImage) return imageResponse(esriImage, "esri", ESRI_ATTRIBUTION);

  return aerialFallbackResponse(mapsKey ? "upstream" : "unconfigured");
}
