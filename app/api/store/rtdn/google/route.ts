import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { asOneTimeVoid, decodeRtdnEnvelope } from "@/lib/server/play-rtdn";
import { applyVoidedPurchase } from "@/lib/server/voided-purchases";

export const runtime = "nodejs";

const RTDN_EVENTS = "rtdnEvents";

/**
 * Compare a caller-supplied token against the configured secret without
 * leaking length or content through timing.
 */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * POST /api/store/rtdn/google
 *
 * Cloud Pub/Sub push endpoint for Google Play Real-time Developer
 * Notifications. Authenticated by a shared secret carried in the push
 * subscription's URL (`?token=...`), compared in constant time.
 *
 * Status codes are chosen for Pub/Sub's retry semantics: anything we cannot
 * usefully retry (malformed payload, foreign package, unmatched purchase) is
 * acked with 2xx so Play stops redelivering, while transient failures return
 * 5xx so the message is retried.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.PLAY_RTDN_VERIFICATION_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "RTDN endpoint is not configured." },
      { status: 503 },
    );
  }

  const provided = request.nextUrl.searchParams.get("token") ?? "";
  if (!tokenMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Not retryable — ack so Pub/Sub drops it.
    return NextResponse.json({ ignored: "invalid-json" }, { status: 200 });
  }

  const decodeResult = decodeRtdnEnvelope(body);
  if (!decodeResult.ok) {
    console.warn("[rtdn/google] undecodable envelope:", decodeResult.error);
    return NextResponse.json({ ignored: "undecodable" }, { status: 200 });
  }

  const { messageId, notification } = decodeResult.decoded;

  const expectedPackage = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (expectedPackage && notification.packageName !== expectedPackage) {
    console.warn(
      "[rtdn/google] package mismatch:",
      notification.packageName,
      "expected",
      expectedPackage,
    );
    return NextResponse.json({ ignored: "package-mismatch" }, { status: 200 });
  }

  if (notification.testNotification) {
    // Sent by the "Send test notification" button in Play Console.
    return NextResponse.json({ ok: true, test: true }, { status: 200 });
  }

  const voided = asOneTimeVoid(notification);
  if (!voided) {
    // Purchase notifications are handled by the authenticated verify route,
    // which is the only path that knows which account the buyer is.
    return NextResponse.json({ ignored: "not-a-one-time-void" }, { status: 200 });
  }

  // Pub/Sub is at-least-once. Claim the message id before touching balances so
  // a redelivery cannot double-revoke.
  const eventRef = getAdminDb().collection(RTDN_EVENTS).doc(messageId);
  try {
    await eventRef.create({
      messageId,
      kind: "voidedPurchase",
      orderId: voided.orderId ?? null,
      packageName: notification.packageName,
      eventTimeMillis: notification.eventTimeMillis ?? null,
      receivedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (isAlreadyExists(err)) {
      return NextResponse.json({ ok: true, replay: true }, { status: 200 });
    }
    console.error("[rtdn/google] could not claim message", messageId, err);
    return NextResponse.json({ error: "Retry." }, { status: 500 });
  }

  try {
    const outcome = await applyVoidedPurchase(voided);
    if (outcome.status === "unmatched") {
      console.warn("[rtdn/google] no grant matched order", outcome.orderId);
    }
    try {
      await eventRef.update({ outcome: outcome.status });
    } catch (updateErr) {
      // The void is already committed; keep the claim and ack Pub/Sub.
      console.warn("[rtdn/google] could not record outcome on event", messageId, updateErr);
    }
    return NextResponse.json({ ok: true, outcome: outcome.status }, { status: 200 });
  } catch (err) {
    console.error("[rtdn/google] void handling failed", messageId, err);
    // Release the claim so the Pub/Sub retry can try again.
    await eventRef.delete().catch(() => {});
    return NextResponse.json({ error: "Retry." }, { status: 500 });
  }
}

/** Firestore `create()` collision — the doc already exists. */
function isAlreadyExists(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { code?: number | string }).code === 6 ||
      (err as { code?: number | string }).code === "already-exists")
  );
}
