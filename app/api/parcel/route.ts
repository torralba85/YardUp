import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { parseCoordinateParams } from "@/lib/server/request-validation";
import {
  defaultParcelResolver,
  sanitizeAddress,
} from "@/lib/server/parcel-resolver";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/**
 * GET /api/parcel?lat={lat}&lng={lng}&address={address}
 *
 * HTTP transport adapter delegating to the deep in-process {@link defaultParcelResolver}.
 * Enforces client rate limiting, validates query parameters, and sets HTTP
 * Cache-Control headers based on whether data is live or a regional fallback preset.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const limited = checkRateLimit(request, {
    limit: 60,
    namespace: "parcel",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const coordinates = parseCoordinateParams(searchParams);
  if (coordinates instanceof NextResponse) return coordinates;
  const { lat, lng } = coordinates;
  const requestedAddress = sanitizeAddress(searchParams.get("address"));

  try {
    const parcelData = await defaultParcelResolver.resolve({
      lat,
      lng,
      address: requestedAddress,
    });

    const cacheHeader =
      parcelData.source === "fallback"
        ? "public, max-age=300"
        : "private, max-age=3600";

    return NextResponse.json(parcelData, {
      headers: { "Cache-Control": cacheHeader },
    });
  } catch (err) {
    console.error("[/api/parcel] Unexpected error resolving parcel:", err);
    return NextResponse.json(
      { error: "Failed to resolve parcel data" },
      { status: 500 },
    );
  }
}
