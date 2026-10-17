import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { parseEmailScenario } from "@/lib/scenario-email";
import { buildScenarioShareUrl, isAllowedScenarioUrl } from "@/lib/scenario-share-url";
import { validateEmail } from "@/lib/account-settings";
import { isRecord } from "@/lib/scenario-design";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { checkScenarioEmailRateLimit } from "@/lib/server/scenario-email-rate-limit";
import {
  dispatchScenarioEmail,
  renderScenarioEmail,
  scenarioHeadlineNumbers,
} from "@/lib/server/studio-scenario-email";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const localOrigin =
    process.env.NODE_ENV !== "production" &&
    origin === request.nextUrl.origin &&
    (request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1");
  if (origin !== "https://lotfoundry.net" && !localOrigin) {
    return NextResponse.json({ error: "Open this form on LotFoundry." }, { status: 403, headers });
  }
  let body: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 100_000) throw new Error("Too large");
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 100_000) throw new Error("Too large");
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid or oversized layout request." }, { status: 400, headers }); }
  if (!isRecord(body) || body.website || typeof body.email !== "string" || validateEmail(body.email) || /[<>,;:"\\]/.test(body.email) || typeof body.marketingOptIn !== "boolean" || !isAllowedScenarioUrl(body.scenarioUrl)) {
    return NextResponse.json({ error: "Enter a valid email and LotFoundry layout." }, { status: 400, headers });
  }
  const scenario = parseEmailScenario(body.scenario);
  if (!scenario?.liveParcel || !scenario.liveParcel.address.trim() || !scenario.liveParcel.city.trim() || body.address !== scenario.liveParcel.address || body.parcelId !== scenario.parcelId) {
    return NextResponse.json({ error: "Load a real address and valid design before saving your link." }, { status: 400, headers });
  }
  let numbers: ReturnType<typeof scenarioHeadlineNumbers>;
  try {
    numbers = scenarioHeadlineNumbers(scenario);
    if (![numbers.sqft, numbers.buildCostLow, numbers.buildCostHigh, numbers.monthlyRentLow, numbers.monthlyRentHigh].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Invalid figures");
  } catch {
    return NextResponse.json({ error: "Review the layout's financial assumptions and try again." }, { status: 400, headers });
  }
  const limited = await checkScenarioEmailRateLimit(request);
  if (limited) return limited;
  try {
    const token = randomBytes(24).toString("hex");
    // Rebuild from validated design: never email a caller-supplied redirect or paid return marker.
    const scenarioUrl = buildScenarioShareUrl(scenario, token);
    const email = body.email.trim().toLowerCase();
    const message = renderScenarioEmail(scenario, scenarioUrl, body.marketingOptIn);
    const sendResult = await dispatchScenarioEmail(
      email,
      scenario,
      scenarioUrl,
      body.marketingOptIn,
      token,
    );
    const emailDeliveryStatus = sendResult.delivery === "sent" ? "sent_resend" : "queued_firestore";

    await getAdminDb().collection("studioScenarioLeads").doc(token).create({
      email, marketingOptIn: body.marketingOptIn,
      address: scenario.liveParcel.address, parcelId: scenario.parcelId, city: scenario.liveParcel.city,
      // GeoJSON rings contain nested arrays, which Firestore cannot store directly.
      scenarioUrl, scenarioSnapshot: JSON.stringify(scenario), ...numbers,
      createdAt: FieldValue.serverTimestamp(),
      consentVersion: "studio-layout-v1",
      emailDeliveryStatus,
      resendId: sendResult.resendId ?? null,
      emailPayload: { to: [email], message },
    });

    return NextResponse.json({ ok: true, delivery: sendResult.delivery, scenarioUrl }, { headers });
  } catch {
    return NextResponse.json({ error: "We could not save your link. Please try again shortly." }, { status: 503, headers });
  }
}
