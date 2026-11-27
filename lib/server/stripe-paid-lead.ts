import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { LEAD_UNLOCK_PRICE_CENTS } from "../lead-unlock-pricing";
import { rotateFailedActiveCheckout } from "./active-checkout-sessions";
import { getAdminDb } from "./firebase-admin";
import { grantLeadUnlock } from "./lead-unlocks";
import { stripeCheckoutRecord, stripeObjectId, writeLeadRefundLedger } from "./stripe-checkout-record";

export type PaidLeadOutcome = "granted" | "reversed" | "refund_requested" | "refund_needs_review";

/** Called only after validating a paid lead session, from either fulfillment entry point. */
export async function settlePaidLeadCheckout(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  builderId: string,
  requestId: string,
): Promise<PaidLeadOutcome> {
  const result = await grantLeadUnlock({
    builderId,
    requestId,
    stripeSessionId: session.id,
    amount: LEAD_UNLOCK_PRICE_CENTS,
  });
  if (result.status === "reversed") return "reversed";
  if (result.status !== "blocked") return "granted";

  let refundStatus = result.refundStatus;
  if (!result.refundId) {
    const paymentIntent = stripeObjectId(session.payment_intent);
    if (!paymentIntent) throw new Error("Paid lead Checkout is missing its PaymentIntent");
    const db = getAdminDb();
    const record = stripeCheckoutRecord(db, session.id);
    const builder = db.collection("builders").doc(builderId);

    // Recover a provider write that succeeded before Firestore could record it,
    // including a replay after Stripe's idempotency cache expires.
    const existing = (await stripe.refunds.list({ payment_intent: paymentIntent, limit: 100 })).data;
    const prior = existing.find((refund) => refund.metadata?.lotfoundry_checkout === session.id);
    const active = existing.filter((refund) =>
      refund.status === "succeeded" || refund.status === "pending",
    );
    const alreadyRefunded = active.reduce((amount, refund) => amount + refund.amount, 0);
    const covered = session.amount_total != null && alreadyRefunded >= session.amount_total;
    const refund = prior ?? (covered ? active[0] : undefined) ?? await stripe.refunds.create({
      payment_intent: paymentIntent,
      metadata: { lotfoundry_checkout: session.id, lotfoundry_reason: result.reason },
    }, { idempotencyKey: `lotfoundry-lead-refund:${session.id}` });

    refundStatus = await db.runTransaction(async (tx) => {
      const [latest, profile] = await Promise.all([tx.get(record), tx.get(builder)]);
      // A refund webhook may have already stored a newer provider status.
      if (latest.data()?.leadRefundId) return latest.data()?.leadRefundStatus as string;
      const status = refund.status ?? "unknown";
      tx.set(record, {
        paymentIntent,
        leadRefundId: refund.id,
        leadRefundStatus: status,
        leadRefundUpdatedAt: FieldValue.serverTimestamp(),
        ...(!["pending", "succeeded"].includes(status) ? { requiresReview: true } : {}),
      }, { merge: true });
      if (profile.exists) writeLeadRefundLedger(tx, builder, session.id, status);
      return status;
    });
  }

  if (refundStatus === "pending" || refundStatus === "succeeded") {
    await rotateFailedActiveCheckout(
      { purchaseType: "lead_unlock", accountId: builderId, purchaseId: requestId },
      session.id,
    );
    return "refund_requested";
  }

  console.error("[stripe/lead-refund] Refund needs review", { sessionId: session.id, refundStatus });
  return "refund_needs_review";
}