import { FieldValue, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";

/** Server-only record keyed by Checkout Session, independent of the current grant owner. */
export function stripeCheckoutRecord(db: Firestore, sessionId: string) {
  return db.collection("stripeCheckoutReconciliation").doc(sessionId);
}

export function writeLeadRefundLedger(
  tx: Transaction,
  builder: DocumentReference,
  sessionId: string,
  refundStatus: string,
) {
  tx.set(builder.collection("ledger").doc(`stripe_lead_refund_${sessionId}`), {
    type: "refund",
    creditsChange: 0,
    amountPaid: 0,
    stripeSessionId: sessionId,
    stripeRefundStatus: refundStatus,
    description: refundStatus === "succeeded" || refundStatus === "pending"
      ? "Refund for unavailable lead"
      : "Lead refund needs support review",
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export function stripeObjectId(reference: string | { id: string } | null | undefined) {
  return typeof reference === "string" ? reference : reference?.id;
}