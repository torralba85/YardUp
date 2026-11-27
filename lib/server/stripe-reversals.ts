import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { rotateFailedActiveCheckout } from "./active-checkout-sessions";
import { getAdminDb } from "./firebase-admin";
import { unlockId } from "./lead-unlocks";
import { stripeCheckoutRecord, stripeObjectId, writeLeadRefundLedger } from "./stripe-checkout-record";

export type StripeReversalEvent =
  | Stripe.RefundCreatedEvent
  | Stripe.RefundUpdatedEvent
  | Stripe.RefundFailedEvent
  | Stripe.ChargeDisputeCreatedEvent
  | Stripe.ChargeDisputeClosedEvent;

type CheckoutPurchase =
  | { type: "certificate"; uid: string; certKey: string }
  | { type: "credit_pack"; builderId: string }
  | { type: "lead_unlock"; builderId: string; requestId: string };

function checkoutPurchase(session: Stripe.Checkout.Session): CheckoutPurchase | undefined {
  const { purchaseType, uid, certKey, builderId, requestId } = session.metadata ?? {};
  if (purchaseType === "certificate" && uid && certKey) return { type: purchaseType, uid, certKey };
  if (purchaseType === "credit_pack" && builderId) return { type: purchaseType, builderId };
  if (purchaseType === "lead_unlock" && builderId && requestId) {
    return { type: purchaseType, builderId, requestId };
  }
}

async function revokeEntitlement(
  db: Firestore,
  tx: Transaction,
  session: Stripe.Checkout.Session,
  purchase: CheckoutPurchase,
  reversedAmount: number,
) {
  if (purchase.type === "certificate") {
    // Query by immutable session id because verified-email recovery can move the grant.
    const grants = await tx.get(db.collection("certificatePurchases")
      .where("stripeSessionId", "==", session.id));
    for (const grant of grants.docs) {
      if (!grant.data().accountDeleted) tx.delete(grant.ref);
    }
    return 0;
  }

  if (purchase.type === "lead_unlock") {
    const ref = db.collection("leadUnlocks").doc(unlockId(purchase.builderId, purchase.requestId));
    const grant = await tx.get(ref);
    // A credit purchase or a different Stripe payment may now own this entitlement.
    if (grant.data()?.stripeSessionId === session.id) tx.delete(ref);
    return 0;
  }

  const builder = db.collection("builders").doc(purchase.builderId);
  const ledger = builder.collection("ledger");
  const [profile, payment] = await Promise.all([
    tx.get(builder),
    tx.get(ledger.doc(`${purchase.builderId}_${session.id}`)),
  ]);
  const purchasedCredits = payment.data()?.creditsChange;
  if (payment.data()?.type !== "purchase" || !Number.isSafeInteger(purchasedCredits) ||
      purchasedCredits <= 0) return 0;

  const balance = profile.data()?.credits;
  const recovered = typeof balance === "number"
    ? Math.min(purchasedCredits, Math.max(0, balance))
    : 0;
  const shortfall = purchasedCredits - recovered;
  if (profile.exists) {
    if (recovered > 0) {
      tx.update(builder, { credits: balance - recovered, updatedAt: FieldValue.serverTimestamp() });
    }
    tx.set(ledger.doc(`stripe_reversal_${session.id}`), {
      type: "refund",
      creditsChange: -recovered,
      requestedRevokeCredits: purchasedCredits,
      shortfall,
      stripeSessionId: session.id,
      amountReversedCents: reversedAmount,
      description: "Stripe payment reversal",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return shortfall;
}

export async function reconcileStripeReversal(stripe: Stripe, event: StripeReversalEvent) {
  const object = event.data.object;
  const chargeId = stripeObjectId(object.charge);
  const paymentIntent = stripeObjectId(object.payment_intent) ??
    (chargeId ? stripeObjectId((await stripe.charges.retrieve(chargeId)).payment_intent) : undefined);
  if (!paymentIntent) return;

  const { data: [session] } = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent, limit: 1,
  });
  if (!session || session.mode !== "payment" || session.livemode !== event.livemode ||
      !session.amount_total || !session.currency) return;
  const purchase = checkoutPurchase(session);
  if (!purchase) return;

  let reversedAmount = 0;
  let leadRefund: Stripe.Refund | undefined;
  if (object.object === "refund") {
    // Read current refund state because Stripe can redeliver a stale snapshot,
    // and multiple successful partial refunds can add up to a full reversal.
    for await (const refund of stripe.refunds.list({ payment_intent: paymentIntent, limit: 100 })) {
      if (purchase.type === "lead_unlock" && refund.id === object.id) leadRefund = refund;
      if (refund.status === "succeeded" && refund.currency === session.currency) {
        reversedAmount += refund.amount;
      }
    }
  } else if (object.status === "lost" && object.currency === session.currency) {
    reversedAmount = object.amount;
  }

  const full = reversedAmount >= session.amount_total;
  const db = getAdminDb();
  const record = stripeCheckoutRecord(db, session.id);
  const eventRef = record.collection("events").doc(event.id);
  await db.runTransaction(async (tx) => {
    const [previous, receipt] = await Promise.all([tx.get(record), tx.get(eventRef)]);
    if (receipt.exists) return;

    const prior = previous.data();
    const autoRefund = leadRefund && prior?.leadRefundReason &&
      (leadRefund.id === prior.leadRefundId || leadRefund.metadata?.lotfoundry_checkout === session.id)
      ? leadRefund
      : undefined;
    const builder = autoRefund && purchase.type === "lead_unlock"
      ? await tx.get(db.collection("builders").doc(purchase.builderId))
      : undefined;
    const shortfall = full && !prior?.reversedAt
      ? await revokeEntitlement(db, tx, session, purchase, reversedAmount)
      : 0;
    const needsReview = shortfall > 0 ||
      (!full && (object.object === "refund" || object.status !== "won")) ||
      (object.status === "won" && Boolean(prior?.reversedAt));
    if (builder?.exists && autoRefund) {
      writeLeadRefundLedger(tx, builder.ref, session.id, autoRefund.status ?? "unknown");
    }
    tx.create(eventRef, {
      eventType: event.type,
      stripeObjectId: object.id,
      stripeStatus: object.status ?? "unknown",
      observedReversedAmountCents: reversedAmount,
      currency: session.currency,
      requiresReview: needsReview,
      receivedAt: FieldValue.serverTimestamp(),
    });
    tx.set(record, {
      purchaseType: purchase.type,
      paymentIntent,
      ...(full && !prior?.reversedAt ? {
        reversedAt: FieldValue.serverTimestamp(),
        reversedAmountCents: reversedAmount,
        leadCreditShortfall: shortfall,
      } : {}),
      ...(autoRefund ? {
        leadRefundId: autoRefund.id,
        leadRefundStatus: autoRefund.status ?? "unknown",
        leadRefundUpdatedAt: FieldValue.serverTimestamp(),
      } : {}),
      ...(needsReview ? { requiresReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  // Outside the transaction so a retry can finish rotating after a crash.
  if (full && purchase.type === "certificate") {
    await rotateFailedActiveCheckout({
      purchaseType: "certificate", accountId: purchase.uid, purchaseId: purchase.certKey,
    }, session.id);
  } else if (full && purchase.type === "lead_unlock") {
    await rotateFailedActiveCheckout({
      purchaseType: "lead_unlock", accountId: purchase.builderId, purchaseId: purchase.requestId,
    }, session.id);
  }
}