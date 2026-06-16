import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const MAPS_STATIC_API = "https://maps.googleapis.com/maps/api/staticmap";
const TIMEOUT_MS = 5000;

export const runtime = "nodejs";

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

/**
 * GET /api/aerial?lat={lat}&lng={lng}&w={width}&h={height}
 *
 * Proxies a Google Maps Static satellite image request server-side so that
 * GOOGLE_MAPS_API_KEY is never exposed to the browser. Returns the raw
 * image bytes with the correct Content-Type.
 *
 * Images are cached for 1 week since satellite imagery rarely changes.
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
  if (!mapsKey) {
    return aerialFallbackResponse("unconfigured");
  }

  const url = new URL(MAPS_STATIC_API);
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", "19");
  url.searchParams.set("size", `${w}x${h}`);
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("scale", "2"); // retina
  url.searchParams.set("key", mapsKey);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[/api/aerial] Maps Static returned ${res.status}`);
      return aerialFallbackResponse("upstream");
    }

    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.warn("[/api/aerial] Fetch failed:", err);
    return aerialFallbackResponse("upstream");
  }
}
