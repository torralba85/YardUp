import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { getMatchedBuilders } from "@/lib/marketplace";
import type { ServiceArea } from "@/lib/marketplace-types";

export const runtime = "nodejs";

/**
 * POST /api/marketplace/match
 *
 * Server-side lead matching endpoint (Pass 2 / Task 6B). Matches active builders
 * against a parcel's city and state on the server rather than sending full
 * builder directories to untrusted clients.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parcelCity =
      typeof body?.parcelCity === "string" ? body.parcelCity.trim() : "";

    if (!parcelCity) {
      return NextResponse.json(
        { error: "parcelCity is required" },
        { status: 400 },
      );
    }

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
      state: typeof body?.parcelState === "string" ? body.parcelState : undefined,
      county: typeof body?.parcelCounty === "string" ? body.parcelCounty : undefined,
    });

    return NextResponse.json({
      matchedBuilderIds: matched.map((b) => b.id),
      count: matched.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to match builders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
