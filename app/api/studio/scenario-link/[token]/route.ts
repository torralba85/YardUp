import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { parseEmailScenario } from "@/lib/scenario";
import { validLayoutToken } from "@/lib/scenario-url";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limited = checkRateLimit(request as unknown as NextRequest, {
    namespace: "scenario-link-read",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    for (const [key, val] of Object.entries(headers)) limited.headers.set(key, val);
    return limited;
  }

  const { token } = await params;
  if (!validLayoutToken(token)) return NextResponse.json({ error: "Layout not found." }, { status: 404, headers });
  try {
    const doc = await getAdminDb().collection("studioScenarioLeads").doc(token).get();
    const stored = doc.data()?.scenarioSnapshot;
    let value: unknown = null;
    try { if (typeof stored === "string" && stored.length <= 100_000) value = JSON.parse(stored); } catch { /* Invalid stored data is not a layout. */ }
    const scenario = parseEmailScenario(value);
    if (!scenario?.liveParcel) return NextResponse.json({ error: "Layout not found." }, { status: 404, headers });
    // Public bearer read projects only the design, never email, consent, queue payload or paid data.
    return NextResponse.json({ scenario }, { headers });
  } catch { return NextResponse.json({ error: "Your layout is temporarily unavailable. Try again." }, { status: 503, headers }); }
}
