import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { grantLeadUnlock } from "@/lib/server/lead-unlocks";
import { grantCertificate } from "@/lib/server/certificate-purchases";
import { LEAD_UNLOCK_PRICE_CENTS, getStripe } from "@/lib/stripe";
import { CERTIFICATE_PRICE_CENTS } from "@/lib/certificate-pricing";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { creditPackPriceCents } from "@/lib/credit-pack-pricing";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

function isExpectedPaidCheckout(
  session: Stripe.Checkout.Session,
  amountCents: number,
): boolean {
  return (
    session.payment_status === "paid" &&
    session.mode === "payment" &&
    session.currency === "usd" &&
    session.amount_total === amountCents
  );
}

/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe signature against the RAW request body (must read
 * `text()` before any parse, 2A), then on `checkout.session.completed` writes
 * the leadUnlocks grant. The grant's deterministic id makes replays and Stripe
 * retries no-ops, so this handler is safe to receive the same event twice.
 */
export async function POST(request: NextRequest) {
  const stripe = await getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const purchaseType = session.metadata?.purchaseType;

    if (purchaseType === "certificate") {
      if (!isExpectedPaidCheckout(session, CERTIFICATE_PRICE_CENTS)) {
        console.error(`[stripe/webhook] Rejected invalid certificate checkout ${session.id}`);
      } else {
        // User certificate purchase. Deterministic grant id makes a replayed
        // webhook a no-op, so this is safe to receive twice.
        const uid = session.metadata?.uid;
        const certKey = session.metadata?.certKey;
        if (uid && certKey) {
          await grantCertificate({
            uid,
            certKey,
            stripeSessionId: session.id,
            amount: session.amount_total ?? CERTIFICATE_PRICE_CENTS,
          });
        } else {
          console.error(
            `[stripe/webhook] Missing uid or certKey in certificate purchase metadata for session ${session.id}`,
          );
        }
      }
    } else if (purchaseType === "credit_pack") {
      const builderId = session.metadata?.builderId;
      const creditsToGrant = Number(session.metadata?.creditsToGrant);
      const expectedAmount = creditPackPriceCents(creditsToGrant);
      if (expectedAmount === null || !isExpectedPaidCheckout(session, expectedAmount)) {
        console.error(`[stripe/webhook] Rejected invalid credit-pack checkout ${session.id}`);
      } else {
        if (builderId) {
          const adminDb = getAdminDb();
          const builderRef = adminDb.collection("builders").doc(builderId);
          const ledgerRef = builderRef.collection("ledger").doc(`${builderId}_${session.id}`);

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
            const currentCredits = typeof data?.credits === "number" ? data.credits : 0;

            transaction.update(builderRef, {
              credits: currentCredits + creditsToGrant,
              updatedAt: FieldValue.serverTimestamp(),
            });

            transaction.set(ledgerRef, {
              type: "purchase",
              creditsChange: creditsToGrant,
              amountPaid: (session.amount_total ?? 0) / 100,
              stripeSessionId: session.id,
              createdAt: FieldValue.serverTimestamp(),
            });
          });
        }
      }
    } else if (purchaseType === "lead_unlock" || purchaseType === undefined) {
      if (!isExpectedPaidCheckout(session, LEAD_UNLOCK_PRICE_CENTS)) {
        console.error(`[stripe/webhook] Rejected invalid lead-unlock checkout ${session.id}`);
      } else {
        const builderId = session.metadata?.builderId;
        const requestId = session.metadata?.requestId;
        // Grant only on confirmed payment. Card checkout is always "paid" by the
        // time this fires; the guard stops a delayed payment method from revealing
        // contact during its processing window (fulfil on async_payment_succeeded
        // instead if one is ever enabled).
        if (builderId && requestId) {
          await grantLeadUnlock({
            builderId,
            requestId,
            stripeSessionId: session.id,
            amount: session.amount_total ?? LEAD_UNLOCK_PRICE_CENTS,
          });
        }
      }
    }
  }

  // Refunds / bad-lead credits are handled manually in the Stripe Dashboard for
  // now; there is intentionally no charge.refunded handler, so a refund does not
  // auto-revoke the leadUnlocks grant.

  return NextResponse.json({ received: true });
}
