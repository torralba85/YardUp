import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isPlainPlaceText, parseEmailScenario } from "@/lib/scenario-email";
import { buildScenarioShareUrl, isAllowedScenarioUrl } from "@/lib/scenario-share-url";
import { validateEmail } from "@/lib/account-settings";
import { isRecord } from "@/lib/scenario-design";
import { verifyLimitedUseAppCheck } from "@/lib/server/app-check";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { checkScenarioEmailRateLimit } from "@/lib/server/scenario-email-rate-limit";
import {
  dispatchScenarioEmail,
  renderScenarioEmail,
  scenarioHeadlineNumbers,
  type SendScenarioEmailResult,
} from "@/lib/server/studio-scenario-email";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
// Client text printed into the email. Real parcel labels are far shorter.
const MAX_ADDRESS_LENGTH = 120;
const MAX_CITY_LENGTH = 80;
const MAX_RENT_BASIS_LENGTH = 160;

/** Local development without a registered App Check debug token. Never honored in production. */
function appCheckBypassed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.LOTFOUNDRY_ALLOW_PUBLIC_API === "true";
}

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
  if (!scenario?.liveParcel || !isPlainPlaceText(scenario.liveParcel.address, MAX_ADDRESS_LENGTH) || !isPlainPlaceText(scenario.liveParcel.city, MAX_CITY_LENGTH) || body.address !== scenario.liveParcel.address || body.parcelId !== scenario.parcelId) {
    return NextResponse.json({ error: "Load a real address and valid design before saving your link." }, { status: 400, headers });
  }
  let numbers: ReturnType<typeof scenarioHeadlineNumbers>;
  try {
    numbers = scenarioHeadlineNumbers(scenario);
    if (![numbers.sqft, numbers.buildCostLow, numbers.buildCostHigh, numbers.monthlyRentLow, numbers.monthlyRentHigh].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Invalid figures");
    // The rent basis quotes the client's market area label, so it gets the same text check.
    if (!isPlainPlaceText(numbers.rentBasis, MAX_RENT_BASIS_LENGTH)) throw new Error("Invalid rent basis");
  } catch {
    return NextResponse.json({ error: "Review the layout's financial assumptions and try again." }, { status: 400, headers });
  }
  // Origin is forgeable and forwarding headers rotate, so before any quota or write, a
  // consumed limited-use App Check token must show this is one real browser request.
  if (!appCheckBypassed()) {
    const appCheck = await verifyLimitedUseAppCheck(request);
    if (appCheck === "unavailable") {
      return NextResponse.json({ error: "Layout email is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { ...headers, "Retry-After": "60" } });
    }
    if (appCheck !== "valid") {
      return NextResponse.json({ error: "We couldn't verify this browser. Refresh the page and try again." }, { status: 403, headers });
    }
  }
  const email = body.email.trim().toLowerCase();
  const limited = await checkScenarioEmailRateLimit(request, email);
  if (limited) return limited;
  try {
    const token = randomBytes(24).toString("hex");
    // Rebuild from validated design: never email a caller-supplied redirect or paid return marker.
    const scenarioUrl = buildScenarioShareUrl(scenario, token);
    const message = renderScenarioEmail(scenario, scenarioUrl, body.marketingOptIn);

    // Persist the snapshot first: the emailed link must never point at a layout that was not saved.
    const lead = getAdminDb().collection("studioScenarioLeads").doc(token);
    await lead.create({
      email, marketingOptIn: body.marketingOptIn,
      address: scenario.liveParcel.address, parcelId: scenario.parcelId, city: scenario.liveParcel.city,
      // GeoJSON rings contain nested arrays, which Firestore cannot store directly.
      scenarioUrl, scenarioSnapshot: JSON.stringify(scenario), ...numbers,
      createdAt: FieldValue.serverTimestamp(),
      consentVersion: "studio-layout-v1",
      emailDeliveryStatus: "queued_firestore",
      resendId: null,
      emailPayload: { to: [email], message },
    });

    // From here the snapshot exists, so a transport problem degrades to "queued" instead of a 503.
    let sendResult: SendScenarioEmailResult = { delivery: "queued" };
    try {
      sendResult = await dispatchScenarioEmail(email, message, token);
    } catch (error) {
      console.error("[email-scenario-link] dispatch failed:", error instanceof Error ? error.message : "unknown");
    }
    if (sendResult.delivery === "sent") {
      try {
        await lead.update({ emailDeliveryStatus: "sent_resend", resendId: sendResult.resendId ?? null });
      } catch (error) {
        // The email went out and the snapshot is saved; only the status bookkeeping is stale.
        console.error("[email-scenario-link] delivery status update failed:", sendResult.resendId, error instanceof Error ? error.message : "unknown");
      }
    }

    return NextResponse.json({ ok: true, delivery: sendResult.delivery, scenarioUrl }, { headers });
  } catch {
    return NextResponse.json({ error: "We could not save your link. Please try again shortly." }, { status: 503, headers });
  }
}
