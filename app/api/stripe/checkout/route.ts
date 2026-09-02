import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  replaceExpiredActiveCheckout,
  reserveActiveCheckout,
  saveActiveCheckoutSession,
} from "@/lib/server/active-checkout-sessions";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { grantLeadUnlock, isLeadUnlocked } from "@/lib/server/lead-unlocks";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";

export const runtime = "nodejs";

/** POST /api/stripe/checkout { requestId, checkoutAttemptId? } */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const builderId = auth.uid;

  const body = await request.json().catch(() => null);
  const requestId =
    typeof body?.requestId === "string" ? body.requestId.trim() : "";
  // Clients loaded before checkoutAttemptId was introduced omit it. Give those
  // requests a one-off server token, while rejecting malformed supplied values.
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? randomUUID()
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";
  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 },
    );
  }

  const reqSnap = await getAdminDb()
    .collection("connectionRequests")
    .doc(requestId)
    .get();
  if (!reqSnap.exists) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const requestData = reqSnap.data();
  if (requestData?.status !== "submitted") {
    return NextResponse.json(
      { error: "Lead is no longer available" },
      { status: 409 },
    );
  }
  const matched: string[] = requestData?.matchedBuilderIds ?? [];
  if (!matched.includes(builderId)) {
    return NextResponse.json(
      { error: "Not a matched builder for this lead" },
      { status: 403 },
    );
  }

  if (await isLeadUnlocked(builderId, requestId)) {
    return NextResponse.json({ status: "granted", alreadyUnlocked: true });
  }

  const stripe = await getStripe();
  if (!stripe) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.LOTFOUNDRY_DEMO_UNLOCKS !== "true"
    ) {
      return NextResponse.json(
        { error: "Payments are not available." },
        { status: 503 },
      );
    }
    await grantLeadUnlock({
      builderId,
      requestId,
      stripeSessionId: `demo_${requestId}`,
      amount: LEAD_UNLOCK_PRICE_CENTS,
      demo: true,
    });
    return NextResponse.json({ status: "granted", demo: true });
  }

  if (!checkoutAttemptId || checkoutAttemptId.length > 100) {
    return NextResponse.json(
      { error: "A valid checkoutAttemptId is required" },
      { status: 400 },
    );
  }

  const origin = resolveCheckoutOrigin(request.headers);
  if (!origin) {
    console.error(
      "[stripe/checkout] No request Origin and NEXT_PUBLIC_APP_URL is unset; cannot build return URLs.",
    );
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 500 },
    );
  }

  const previewSerial =
    typeof requestData?.preview?.previewSerial === "string"
      ? requestData.preview.previewSerial
      : requestId;
  const reservationInput = {
    purchaseType: "lead_unlock" as const,
    accountId: builderId,
    purchaseId: requestId,
    attemptId: checkoutAttemptId,
    parameters: { origin, previewSerial },
  };

  try {
    let reservation = await reserveActiveCheckout(reservationInput);

    // A second tab resumes the existing payable Session, preventing duplicate
    // charges while retaining a stable key for the transport retry.
    for (let retry = 0; retry < 2; retry += 1) {
      if (reservation.sessionId && reservation.sessionUrl) {
        const existing = await stripe.checkout.sessions.retrieve(
          reservation.sessionId,
        );
        if (existing.status === "open") {
          return NextResponse.json({ url: reservation.sessionUrl });
        }
        if (existing.status === "complete") {
          return NextResponse.json(
            { error: "Payment is being confirmed. Please refresh shortly." },
            { status: 409 },
          );
        }
        if (existing.status !== "expired") {
          return NextResponse.json(
            { error: "Payments are temporarily unavailable." },
            { status: 503 },
          );
        }
        reservation = await replaceExpiredActiveCheckout(
          reservationInput,
          reservation.attemptId,
        );
        continue;
      }

      const sessionOrigin = reservation.parameters.origin;
      const sessionPreviewSerial = reservation.parameters.previewSerial;
      if (!sessionOrigin || !sessionPreviewSerial) {
        throw new Error("Active checkout reservation is missing its parameters");
      }
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          submit_type: "pay",
          payment_method_types: ["card"],
          payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: LEAD_UNLOCK_PRICE_CENTS,
                product_data: {
                  name: `LotFoundry lead unlock — ${sessionPreviewSerial}`,
                },
              },
            },
          ],
          metadata: { purchaseType: "lead_unlock", builderId, requestId },
          success_url: `${sessionOrigin}/builder?lead=${requestId}&unlocked=1`,
          cancel_url: `${sessionOrigin}/builder?lead=${requestId}`,
        },
        {
          idempotencyKey: createStripeIdempotencyKey(
            "lead_unlock",
            builderId,
            requestId,
            reservation.attemptId,
          ),
        },
      );
      if (!session.url) {
        throw new Error("Stripe returned a Checkout Session without a URL");
      }

      const saved = await saveActiveCheckoutSession(
        reservationInput,
        reservation,
        {
          id: session.id,
          url: session.url,
          ...(session.expires_at
            ? { expiresAtMs: session.expires_at * 1000 }
            : {}),
        },
      );
      if (saved.attemptId === reservation.attemptId) {
        return NextResponse.json({ url: saved.sessionUrl ?? session.url });
      }
      reservation = saved;
    }

    return NextResponse.json(
      { error: "Could not resume checkout. Please try again." },
      { status: 409 },
    );
  } catch (err) {
    console.error("[stripe/checkout] Failed to create Checkout session:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
