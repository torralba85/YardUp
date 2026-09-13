import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { grantLeadUnlock } from "@/lib/server/lead-unlocks";
import { grantCertificate } from "@/lib/server/certificate-purchases";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { CREDIT_PACK_PRICES_CENTS, isCreditPackSize } from "@/lib/credit-packs";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { hasExpectedPayment } from "@/lib/server/stripe-payment-guard";
import { rotateFailedActiveCheckout } from "@/lib/server/active-checkout-sessions";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/**
 * Rotate the reservation a Checkout Session was minted from, so a delayed
 * payment that failed does not leave the buyer holding a `complete` Session
 * that can never be paid. Credit packs reserve nothing, so they need no
 * rotation.
 */
async function rotateReservationForFailedSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const metadata = session.metadata ?? {};

  if (metadata.purchaseType === "lead_unlock") {
    const { builderId, requestId } = metadata;
    if (builderId && requestId) {
      await rotateFailedActiveCheckout(
        {
          purchaseType: "lead_unlock",
          accountId: builderId,
          purchaseId: requestId,
        },
        session.id,
      );
    }
    return;
  }

  if (metadata.purchaseType === "certificate") {
    const { uid, certKey } = metadata;
    if (uid && certKey) {
      await rotateFailedActiveCheckout(
        { purchaseType: "certificate", accountId: uid, purchaseId: certKey },
        session.id,
      );
    }
  }
}

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature against the RAW request body (must read
 * `text()` before any parse), then fulfils only recognized, fully paid Checkout
 * purchases whose currency and amount exactly match LotFoundry's server-side
 * catalog. Deterministic grant/ledger ids make Stripe retries safe.
 */
export async function POST(request: NextRequest) {
  const stripe = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // A delayed payment that failed can never become paid, but the reservation
  // still holds its Session. Rotate it so the buyer can start a fresh checkout
  // instead of being handed the dead one on every retry.
  if (event.type === "checkout.session.async_payment_failed") {
    await rotateReservationForFailedSession(
      event.data.object as Stripe.Checkout.Session,
    );
    return NextResponse.json({ received: true });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const purchaseType = session.metadata?.purchaseType;

  if (purchaseType === "certificate") {
    if (!hasExpectedPayment(session, CERTIFICATE_PRICE_CENTS)) {
      return NextResponse.json({ received: true });
    }

    const uid = session.metadata?.uid;
    const certKey = session.metadata?.certKey;
    if (uid && certKey) {
      await grantCertificate({
        uid,
        certKey,
        stripeSessionId: session.id,
        amount: CERTIFICATE_PRICE_CENTS,
      });
    } else {
      console.error(
        `[stripe/webhook] Missing uid or certKey in certificate purchase metadata for session ${session.id}`,
      );
    }
  } else if (purchaseType === "credit_pack") {
    const builderId = session.metadata?.builderId;
    const creditsToGrant = Number(session.metadata?.creditsToGrant);

    if (!isCreditPackSize(creditsToGrant)) {
      console.error(
        `[stripe/webhook] Invalid credit pack metadata for session ${session.id}`,
      );
      return NextResponse.json({ received: true });
    }
    if (
      !hasExpectedPayment(session, CREDIT_PACK_PRICES_CENTS[creditsToGrant])
    ) {
      return NextResponse.json({ received: true });
    }
    if (!builderId) {
      console.error(
        `[stripe/webhook] Missing builderId in credit pack metadata for session ${session.id}`,
      );
      return NextResponse.json({ received: true });
    }

    const adminDb = getAdminDb();
    const builderRef = adminDb.collection("builders").doc(builderId);
    const ledgerRef = builderRef
      .collection("ledger")
      .doc(`${builderId}_${session.id}`);

    await adminDb.runTransaction(async (transaction) => {
      const ledgerSnap = await transaction.get(ledgerRef);
      if (ledgerSnap.exists) {
        return;
      }

      const builderDoc = await transaction.get(builderRef);
      if (!builderDoc.exists) {
        throw new Error(`Builder ${builderId} not found`);
      }
      const data = builderDoc.data();
      const currentCredits =
        typeof data?.credits === "number" ? data.credits : 0;

      transaction.update(builderRef, {
        credits: currentCredits + creditsToGrant,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(ledgerRef, {
        type: "purchase",
        creditsChange: creditsToGrant,
        amountPaid: CREDIT_PACK_PRICES_CENTS[creditsToGrant] / 100,
        stripeSessionId: session.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } else if (purchaseType === "lead_unlock") {
    if (!hasExpectedPayment(session, LEAD_UNLOCK_PRICE_CENTS)) {
      return NextResponse.json({ received: true });
    }

    const builderId = session.metadata?.builderId;
    const requestId = session.metadata?.requestId;
    if (builderId && requestId) {
      await grantLeadUnlock({
        builderId,
        requestId,
        stripeSessionId: session.id,
        amount: LEAD_UNLOCK_PRICE_CENTS,
      });
    } else {
      console.error(
        `[stripe/webhook] Missing builderId or requestId in lead unlock metadata for session ${session.id}`,
      );
    }
  } else {
    console.error(
      `[stripe/webhook] Ignoring unknown purchaseType for session ${session.id}`,
    );
  }

  // Refunds / bad-lead credits are handled manually in the Stripe Dashboard for
  // now; there is intentionally no charge.refunded handler, so a refund does not
  // auto-revoke a fulfilled purchase.
  return NextResponse.json({ received: true });
}
