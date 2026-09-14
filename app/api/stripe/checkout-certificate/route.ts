import { type NextRequest, NextResponse } from "next/server";
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
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";
import { hasExpectedPayment } from "@/lib/server/stripe-payment-guard";
import { describeStripeError } from "@/lib/server/stripe-errors";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Firestore doc ids cap at ~1500 bytes; a certificate key is a short slug, so
 * anything longer is a malformed/abusive request. */
const MAX_CERT_KEY_LEN = 200;

/**
 * POST /api/stripe/checkout-certificate  { certKey, parcelName, checkoutAttemptId? }
 *
 * Starts a certificate purchase for the authenticated user. With a Stripe key:
 * creates a Checkout session and returns its URL. Without one (demo): grants
 * immediately and stamps the purchase `demo` — gated so a production deploy
 * (which always carries a key) can never reach the demo branch.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const uid = auth.uid;

  const body = await request.json().catch(() => null);
  const certKey = typeof body?.certKey === "string" ? body.certKey.trim() : "";
  const parcelName =
    typeof body?.parcelName === "string" ? body.parcelName.trim() : "";
  // Clients loaded before checkoutAttemptId was introduced omit it. Keep their
  // entitlement-scoped idempotency key stable across network retries, while
  // rejecting malformed supplied values.
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? "legacy-client"
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";
  if (!certKey || certKey.length > MAX_CERT_KEY_LEN) {
    return NextResponse.json(
      { error: "A valid certKey is required" },
      { status: 400 },
    );
  }

  // Already purchased — idempotent success, never a second charge.
  if (await hasCertificate(uid, certKey)) {
    return NextResponse.json({ status: "granted", alreadyPurchased: true });
  }

  const stripe = await getStripe();

  if (!stripe) {
    // Demo/mock grant path. Hard prod guard: even if a prod deploy is
    // misconfigured without a key, refuse to grant unless explicitly opted in.
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

  // One resumable Checkout Session per certificate. A second tab is handed the
  // Session the first one opened rather than a second payable Session.
  const reservationInput = {
    purchaseType: "certificate" as const,
    accountId: uid,
    purchaseId: certKey,
    attemptId: checkoutAttemptId,
    parameters: { origin, parcelName: parcelName ?? "" },
  };

  try {
    let reservation = await reserveActiveCheckout(reservationInput);

    // Two passes at most: resume the reserved Session, or replace it once
    // Stripe confirms it expired. A third pass would mean another writer keeps
    // winning the race, which the 409 below reports rather than looping on.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (reservation.sessionId && reservation.sessionUrl) {
        const existing = await stripe.checkout.sessions.retrieve(
          reservation.sessionId,
        );
        if (existing.status === "open") {
          return NextResponse.json({ url: reservation.sessionUrl });
        }
        if (existing.status === "complete") {
          // See the lead-unlock route: a webhook delivery that never arrives
          // would otherwise strand a buyer who has already paid on this 409
          // forever, because the reservation keeps returning the same Session.
          if (
            existing.payment_status === "paid" &&
            existing.metadata?.uid === uid &&
            existing.metadata?.certKey === certKey &&
            hasExpectedPayment(
              existing,
              CERTIFICATE_PRICE_CENTS,
              "stripe/checkout-certificate",
            )
          ) {
            await grantCertificate({
              uid,
              certKey,
              stripeSessionId: existing.id,
              amount: CERTIFICATE_PRICE_CENTS,
            });
            return NextResponse.json({ status: "granted", reconciled: true });
          }
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

      const reservedOrigin = reservation.parameters.origin;
      const reservedParcelName = reservation.parameters.parcelName;
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          submit_type: "pay",
          integration_identifier: "lotfoundry_certificate_wndqkplz",
          payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: CERTIFICATE_PRICE_CENTS,
                product_data: {
                  name: reservedParcelName
                    ? `LotFoundry Certificate of Feasibility — ${reservedParcelName}`
                    : "LotFoundry Certificate of Feasibility",
                },
              },
            },
          ],
          // The webhook reads these back to write the grant.
          metadata: { purchaseType: "certificate", uid, certKey },
          // Stamp which certificate was bought so the return only unlocks the
          // panel whose key matches (the studio may rehydrate a different parcel).
          success_url: `${reservedOrigin}/studio?cert=${encodeURIComponent(certKey)}`,
          cancel_url: `${reservedOrigin}/studio`,
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
      // A concurrent writer replaced this attempt mid-flight; loop once more so
      // the buyer receives the reservation that actually won.
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
      describeStripeError(err),
      // The summary leads, but this try also covers the reservation reads and
      // writes, Session retrieval, and the grant, so keep the original error
      // for its stack and to identify which of those actually threw.
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
