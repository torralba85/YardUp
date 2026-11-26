import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getMatchedBuilders } from "@/lib/marketplace";
import type { ServiceArea } from "@/lib/marketplace-types";

export const runtime = "nodejs";

const MAX_LOCATION_FIELD_LEN = 120;
const MAX_STATE_FIELD_LEN = 50;

/**
 * POST /api/marketplace/match
 *
 * Authenticated server-side lead matching endpoint. Matches active builders
 * against a parcel's city, state, and county on the server rather than sending
 * full builder directories to untrusted clients.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req);
  if (auth instanceof NextResponse) return auth;

  const limited = checkRateLimit(req, {
    namespace: "marketplace-match",
    limit: 30,
    windowMs: 60_000,
    clientKey: auth.uid,
  });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;
  const parcelCity =
    typeof record.parcelCity === "string" ? record.parcelCity.trim() : "";

  if (!parcelCity) {
    return NextResponse.json(
      { error: "parcelCity is required" },
      { status: 400 },
    );
  }
  if (parcelCity.length > MAX_LOCATION_FIELD_LEN) {
    return NextResponse.json(
      { error: "parcelCity is too long" },
      { status: 400 },
    );
  }

  if (
    record.parcelState !== undefined &&
    (typeof record.parcelState !== "string" ||
      record.parcelState.trim().length > MAX_STATE_FIELD_LEN)
  ) {
    return NextResponse.json(
      { error: "Invalid parcelState" },
      { status: 400 },
    );
  }

  if (
    record.parcelCounty !== undefined &&
    (typeof record.parcelCounty !== "string" ||
      record.parcelCounty.trim().length > MAX_LOCATION_FIELD_LEN)
  ) {
    return NextResponse.json(
      { error: "Invalid parcelCounty" },
      { status: 400 },
    );
  }

  const parcelState =
    typeof record.parcelState === "string" && record.parcelState.trim()
      ? record.parcelState.trim()
      : undefined;
  const parcelCounty =
    typeof record.parcelCounty === "string" && record.parcelCounty.trim()
      ? record.parcelCounty.trim()
      : undefined;

  try {
    const db = getAdminDb();
    const snap = await db
      .collection("builders")
      .where("active", "==", true)
      .get();

    const candidates = snap.docs.map((d) => ({
      id: d.id,
      active: true,
      serviceAreas: (d.data().serviceAreas as ServiceArea[]) || [],
    }));

    const matched = getMatchedBuilders(candidates, {
      city: parcelCity,
      state: parcelState,
      county: parcelCounty,
    });

    return NextResponse.json({
      matchedBuilderIds: matched.map((b) => b.id),
      count: matched.length,
    });
  } catch (error) {
    console.error("[marketplace/match] Failed to match builders:", error);
    return NextResponse.json(
      { error: "Failed to match builders." },
      { status: 500 },
    );
  }
}
