import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";

const MAPS_STATIC_API = "https://maps.googleapis.com/maps/api/staticmap";
const TIMEOUT_MS = 5000;

export const runtime = "nodejs";

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

  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

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
    return new NextResponse("Aerial service not configured", { status: 500 });
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
      console.error(`[/api/aerial] Maps Static returned ${res.status}`);
      return new NextResponse("Aerial image unavailable", { status: 502 });
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
    console.error("[/api/aerial] Fetch failed:", err);
    return new NextResponse("Aerial image unavailable", { status: 502 });
  }
}
