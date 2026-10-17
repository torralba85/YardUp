import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { parseEmailScenario, validLayoutToken } from "@/lib/scenario-email";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
  if (!validLayoutToken(token)) return NextResponse.json({ error: "Layout not found or expired." }, { status: 404, headers });
  try {
    const snapshot = await getAdminDb().collection("emailedLayouts").doc(token).get();
    const data = snapshot.data();
    if (!data || !data.expiresAt || data.expiresAt.toMillis() <= Date.now()) return NextResponse.json({ error: "Layout not found or expired." }, { status: 404, headers });
    const scenario = parseEmailScenario(data.scenario);
    if (!scenario) return NextResponse.json({ error: "Layout not found or expired." }, { status: 404, headers });
    return NextResponse.json({ scenario }, { headers });
  } catch { return NextResponse.json({ error: "Layout is temporarily unavailable." }, { status: 503, headers }); }
}
