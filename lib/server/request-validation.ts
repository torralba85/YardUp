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

/**
 * Check that a caller-supplied identifier is safe to use as a single Firestore
 * document ID segment (non-empty, bounded length, no path separators or
 * reserved relative segments `.` / `..`).
 */
export function isSafeDocumentId(value: unknown, maxLen = 200): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= maxLen &&
    !trimmed.includes("/") &&
    trimmed !== "." &&
    trimmed !== ".."
  );
}

/**
 * Parse an optional latitude or longitude supplied in a JSON body. Returns
 * `undefined` when omitted, a finite in-range number when valid, or `null`
 * when present with an invalid type or out-of-range value.
 */
export function parseOptionalCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}
