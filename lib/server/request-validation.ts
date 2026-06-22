import { NextResponse } from "next/server";

/**
 * Parse and validate `lat`/`lng` query params for a geospatial API route.
 *
 * @param searchParams - The request's query parameters.
 * @returns `{ lat, lng }` when both are present and within valid ranges, or a
 *   400 {@link NextResponse} the route should return when they are missing or
 *   out of range.
 */
export function parseCoordinateParams(searchParams: URLSearchParams):
  | { lat: number; lng: number }
  | NextResponse {
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 },
    );
  }

  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "lat or lng is out of valid range" },
      { status: 400 },
    );
  }

  return { lat, lng };
}
