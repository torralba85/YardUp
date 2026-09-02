import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { getStripe } from "@/lib/stripe";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  replaceExpiredActiveCheckout,
  reserveActiveCheckout,
  saveActiveCheckoutSession,
} from "@/lib/server/active-checkout-sessions";
import {
  grantCertificate,
  hasCertificate,
} from "@/lib/server/certificate-purchases";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";

export const runtime = "nodejs";

const MAX_CERT_KEY_LEN = 200;

/**
 * POST /api/stripe/checkout-certificate
 * { certKey, parcelName, checkoutAttemptId? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const uid = auth.uid;

  const body = await request.json().catch(() => null);
  const certKey = typeof body?.certKey === "string" ? body.certKey.trim() : "";
  const parcelName =
    typeof body?.parcelName === "string" ? body.parcelName.trim() : "";
  // Clients loaded before checkoutAttemptId was introduced omit it. Give those
  // requests a one-off server token, while rejecting malformed supplied values.
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? randomUUID()
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";
  if (!certKey || certKey.length > MAX_CERT_KEY_LEN) {
    return NextResponse.json(
      { error: "A valid certKey is required" },
      { status: 400 },
    );
  }

  if (await hasCertificate(uid, certKey)) {
    return NextResponse.json({ status: "granted", alreadyPurchased: true });
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
    await grantCertificate({
      uid,
      certKey,
      stripeSessionId: `demo_${certKey}`,
      amount: CERTIFICATE_PRICE_CENTS,
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
      "[stripe/checkout-certificate] No request Origin and NEXT_PUBLIC_APP_URL is unset; cannot build return URLs.",
    );
    return NextResponse.json(
      { error: "Payments are temporarily unavailable." },
      { status: 500 },
    );
  }

  const reservationInput = {
    purchaseType: "certificate" as const,
    accountId: uid,
    purchaseId: certKey,
    attemptId: checkoutAttemptId,
    parameters: { origin, parcelName },
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
      if (!sessionOrigin) {
        throw new Error("Active checkout reservation is missing its origin");
      }
      const sessionParcelName = reservation.parameters.parcelName;
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
                unit_amount: CERTIFICATE_PRICE_CENTS,
                product_data: {
                  name: sessionParcelName
                    ? `LotFoundry Certificate of Feasibility — ${sessionParcelName}`
                    : "LotFoundry Certificate of Feasibility",
                },
              },
            },
          ],
          metadata: { purchaseType: "certificate", uid, certKey },
          success_url: `${sessionOrigin}/studio?cert=${encodeURIComponent(certKey)}`,
          cancel_url: `${sessionOrigin}/studio`,
        },
        {
          idempotencyKey: createStripeIdempotencyKey(
            "certificate",
            uid,
            certKey,
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
    console.error(
      "[stripe/checkout-certificate] Failed to create Checkout session:",
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
