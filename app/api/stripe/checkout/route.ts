import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  replaceExpiredActiveCheckout,
  reserveActiveCheckout,
  saveActiveCheckoutSession,
} from "@/lib/server/active-checkout-sessions";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { grantLeadUnlock, isLeadUnlocked } from "@/lib/server/lead-unlocks";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";
import { resolveCheckoutOrigin } from "@/lib/server/checkout-origin";
import { createStripeIdempotencyKey } from "@/lib/server/stripe-idempotency";
import { hasExpectedPayment } from "@/lib/server/stripe-payment-guard";
import { describeStripeError } from "@/lib/server/stripe-errors";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout  { requestId, checkoutAttemptId? }
 *
 * Starts a lead unlock. The authenticated builder must be matched to an active
 * lead. With a Stripe key: creates a Checkout session and returns its URL.
 * Without one (demo): grants immediately and stamps the unlock `demo` — gated
 * so a production deploy can never reach the demo branch accidentally.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;
  const builderId = auth.uid;

  const body = await request.json().catch(() => null);
  const requestId =
    typeof body?.requestId === "string" ? body.requestId.trim() : "";
  // Clients loaded before checkoutAttemptId was introduced omit it. Keep their
  // entitlement-scoped idempotency key stable across network retries, while
  // rejecting malformed supplied values.
  const checkoutAttemptId =
    body?.checkoutAttemptId === undefined
      ? "legacy-client"
      : typeof body.checkoutAttemptId === "string"
        ? body.checkoutAttemptId.trim()
        : "";
  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 },
    );
  }

  // The lead must exist, still be active, and have offered itself to this
  // builder — deleted/withdrawn owner submissions must never remain purchasable.
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

  // Already unlocked — idempotent success, never a second charge.
  if (await isLeadUnlocked(builderId, requestId)) {
    return NextResponse.json({ status: "granted", alreadyUnlocked: true });
  }

  // 48h head start exclusivity check: if another builder holds the window, block purchase.
  if (
    requestData?.headStartUntil &&
    new Date(requestData.headStartUntil).getTime() > Date.now() &&
    requestData?.firstUnlockedBy &&
    requestData.firstUnlockedBy !== builderId
  ) {
    return NextResponse.json(
      { error: "This lead is currently in an exclusive 48-hour window with another builder." },
      { status: 409 },
    );
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
  const previewSerial = requestData?.preview?.previewSerial ?? requestId;

  // One resumable Checkout Session per entitlement. A second tab is handed the
  // Session the first one opened rather than a second payable Session.
  const reservationInput = {
    purchaseType: "lead_unlock" as const,
    accountId: builderId,
    purchaseId: requestId,
    attemptId: checkoutAttemptId,
    parameters: { origin, previewSerial: String(previewSerial) },
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
          // The webhook is the normal fulfilment path. When a delivery never
          // arrives, the reservation keeps handing back this completed Session,
          // so without reconciling here a builder who has already paid retries
          // into the same 409 forever and never receives the lead. Stripe's own
          // record of the Session is the authority, checked against the catalog
          // price exactly as the webhook checks it.
          if (
            existing.payment_status === "paid" &&
            existing.metadata?.builderId === builderId &&
            existing.metadata?.requestId === requestId &&
            hasExpectedPayment(
              existing,
              LEAD_UNLOCK_PRICE_CENTS,
              "stripe/checkout",
            )
          ) {
            await grantLeadUnlock({
              builderId,
              requestId,
              stripeSessionId: existing.id,
              amount: LEAD_UNLOCK_PRICE_CENTS,
            });
            return NextResponse.json({ status: "granted", reconciled: true });
          }
          // Genuinely still pending (a delayed payment method): the webhook
          // will fulfil it, or rotate the reservation if it fails.
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
      const reservedPreviewSerial = reservation.parameters.previewSerial;
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          submit_type: "pay",
          integration_identifier: "lotfoundry_lead_unlock_qmvdjrxn",
          payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: LEAD_UNLOCK_PRICE_CENTS,
                product_data: {
                  name: `LotFoundry lead unlock — ${reservedPreviewSerial}`,
                },
              },
            },
          ],
          metadata: { purchaseType: "lead_unlock", builderId, requestId },
          success_url: `${reservedOrigin}/builder?lead=${requestId}&unlocked=1`,
          cancel_url: `${reservedOrigin}/builder?lead=${requestId}`,
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
      "[stripe/checkout] Failed to create Checkout session:",
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
