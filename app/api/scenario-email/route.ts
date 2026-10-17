import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { parseEmailScenario } from "@/lib/scenario-email";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { scenarioMailConfigured, sendScenarioMail } from "@/lib/server/scenario-mail";
import { checkScenarioEmailRateLimit } from "@/lib/server/scenario-email-rate-limit";
import { validateEmail } from "@/lib/account-settings";
import { isRecord } from "@/lib/scenario-design";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  // Reject cross-site sends; the endpoint is intentionally available without an account.
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin && origin !== "https://lotfoundry.net") return NextResponse.json({ error: "Open this form on LotFoundry." }, { status: 403, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 100_000) return NextResponse.json({ error: "Layout is too large." }, { status: 413, headers });
  let body: unknown;
  try { const text = await request.text(); if (Buffer.byteLength(text) > 100_000) return NextResponse.json({ error: "Layout is too large." }, { status: 413, headers }); body = JSON.parse(text); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (!isRecord(body) || typeof body.email !== "string" || validateEmail(body.email) || /[<>,;:"\\]/.test(body.email) || body.consent !== true) return NextResponse.json({ error: "Enter a valid email and agree to receive your layout." }, { status: 400, headers });
  if (body.website) return NextResponse.json({ message: "Request received." }, { headers });
  const scenario = parseEmailScenario(body.scenario);
  if (!scenario) return NextResponse.json({ error: "This layout could not be saved. Review your design and try again." }, { status: 400, headers });
  if (!scenarioMailConfigured()) return NextResponse.json({ error: "Layout email is not available yet. Your layout is still here." }, { status: 503, headers });
  const limited = await checkScenarioEmailRateLimit(request);
  if (limited) return limited;
  const token = randomBytes(24).toString("hex");
  const email = body.email.trim();
  try {
    // Not accessible via client Firestore. Public read returns only the design, never the email.
    const ref = getAdminDb().collection("emailedLayouts").doc(token);
    await ref.set({ scenario, email, consent: "one-time-layout-v1", createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400_000), status: "pending" });
    try { await sendScenarioMail(email, token); }
    catch { await ref.delete(); throw new Error("Mail delivery failed."); }
    // SMTP acceptance is the success boundary; do not turn an ancillary status-write failure into a resend.
    await ref.update({ status: "accepted" }).catch(() => undefined);
    return NextResponse.json({ message: "Your mail provider accepted the email. Check your inbox and spam folder." }, { headers });
  } catch {
    return NextResponse.json({ error: "We could not email your layout. Please try again later." }, { status: 503, headers });
  }
}
