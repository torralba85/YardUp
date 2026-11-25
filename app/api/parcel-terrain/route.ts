import { NextResponse, type NextRequest } from "next/server";
import { createTerrainGrid } from "@/lib/parcel-terrain";
import { fetchParcelTerrain } from "@/lib/server/parcel-terrain";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, { namespace: "parcel-terrain", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  let boundary: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 50_000) return NextResponse.json({ error: "Parcel boundary is too large." }, { status: 413 });
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 50_000) return NextResponse.json({ error: "Parcel boundary is too large." }, { status: 413 });
    boundary = JSON.parse(text).boundary;
  } catch {
    return NextResponse.json({ error: "A valid parcel boundary is required." }, { status: 400 });
  }
  if (!createTerrainGrid(boundary)) return NextResponse.json({ error: "Terrain preview needs a published parcel boundary under 1,600 ft across." }, { status: 400 });
  try {
    const terrain = await fetchParcelTerrain(boundary);
    if (terrain) return NextResponse.json(terrain, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    // Provider errors can contain URLs and parcel coordinates; keep them private.
  }
  return NextResponse.json({ error: "Ground elevations are unavailable for this parcel. Try again shortly." }, { status: 503 });
}
