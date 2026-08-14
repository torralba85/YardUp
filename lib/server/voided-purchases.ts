/**
 * Remediation for voided Google Play purchases (refunds, chargebacks,
 * developer revocations).
 *
 * Play's voided-purchase notification carries only a `purchaseToken` and
 * `orderId` — no SKU, no account. We resolve it back to the `purchaseGrants`
 * doc written by {@link verifyAndGrantPurchase}, then apply the policy in
 * {@link planVoidRemediation}.
 *
 * Everything here is idempotent: Pub/Sub delivers at-least-once and Play may
 * re-send a void for up to 30 days, so the same message must be safe to
 * process repeatedly.
 */

import { FieldValue } from "firebase-admin/firestore";
import { purchaseId } from "../certificate-purchases-id";
import { getAdminDb } from "./firebase-admin";
import type { VoidedPurchaseNotification } from "./play-rtdn";
import { REFUND_TYPE_FULL } from "./play-rtdn";
import { purchaseTokenHash } from "./purchase-token-hash";

const GRANTS = "purchaseGrants";
const BUILDERS = "builders";
const CERTIFICATE_CREDITS = "certificateCredits";
const CERTIFICATE_PURCHASES = "certificatePurchases";

export { purchaseTokenHash };

/** The stored grant fields this module reads. */
export interface StoredGrant {
  id: string;
  uid: string;
  productId: string;
  credits: number;
  certificateCredits: number;
  transactionId: string;
  certKey?: string;
  voidedAt?: string;
}

/**
 * What a void should take back from the account.
 *
 * Produced by {@link planVoidRemediation} and applied verbatim by
 * {@link applyVoidedPurchase} — the policy lives in one place and the Firestore
 * work does not second-guess it.
 */
export interface VoidRemediationPlan {
  /** Lead credits to subtract from `builders/{uid}.credits`. */
  leadCreditsToRevoke: number;
  /** Certificate credits to subtract from `certificateCredits/{uid}.balance`. */
  certificateCreditsToRevoke: number;
  /**
   * Whether to delete `certificatePurchases/{uid}_{certKey}`, which re-locks
   * the lot certificate. Access is gated on document existence, so deleting is
   * the only thing that actually revokes it.
   */
  revokeCertificateUnlock: boolean;
  /**
   * Whether a balance may go below zero. `false` floors at 0; `true` leaves the
   * account in debt, blocking further unlocks until it is repaid.
   */
  allowNegativeBalance: boolean;
  /** Short machine-readable reason, stored on the ledger entry for support. */
  reason: string;
}

/** Inputs available when deciding what a void should claw back. */
export interface VoidRemediationInput {
  /** The grant this void refers to, as written at purchase time. */
  grant: StoredGrant;
  /** True for a full refund, false for a quantity-based partial refund. */
  fullRefund: boolean;
  /** The account's lead-credit balance at the moment of the void. */
  currentLeadCredits: number;
  /** Whether this grant unlocked a specific lot certificate. */
  hasCertificateUnlock: boolean;
}

/**
 * Decide what a voided purchase takes back.
 *
 * TODO(andrew): implement the clawback policy — see the trade-offs below.
 *
 * The hard case is a builder who bought 10 credits, spent 6 unlocking real
 * homeowner leads (whose contact details they have already seen), then
 * refunded. The lead data cannot be un-seen, so the only lever is the balance.
 *
 *   (a) Floor at zero — revoke up to what is left, never go negative.
 *       Kindest to a legitimate dispute; leaves the spend-then-refund loop open.
 *   (b) Allow debt — revoke the full amount even if the balance goes negative,
 *       blocking future unlocks until they re-purchase. Closes the loop, but a
 *       user whose card issuer forced a chargeback lands in a confusing hole.
 *   (c) Forward-only — record the void, touch no balances. Never punishes a
 *       legitimate refund; fully open to abuse.
 *
 * `currentLeadCredits` is passed in precisely so you can distinguish "refunded
 * without spending" (safe to revoke fully) from "already spent" (the judgement
 * call). `fullRefund` is false for quantity-based partial refunds, where
 * revoking the whole pack would overcharge the user.
 *
 * @param input - The grant, refund type, and current balances.
 * @returns The plan {@link applyVoidedPurchase} will execute.
 */
export function planVoidRemediation(
  input: VoidRemediationInput,
): VoidRemediationPlan {
  // PLACEHOLDER — records the void without altering balances (option (c)).
  // Replace with the policy you want before enabling RTDN in production.
  void input;
  return {
    leadCreditsToRevoke: 0,
    certificateCreditsToRevoke: 0,
    revokeCertificateUnlock: false,
    allowNegativeBalance: false,
    reason: "policy-not-configured",
  };
}

export type ApplyVoidOutcome =
  | { status: "applied"; grantId: string; plan: VoidRemediationPlan }
  | { status: "replay"; grantId: string }
  | { status: "unmatched"; orderId: string };

/**
 * Locate the grant a void refers to.
 *
 * Tries the deterministic doc id first (`google-play:{orderId}` — how
 * {@link verifyAndGrantPurchase} keys grants when Play returns an order id),
 * then falls back to a `purchaseTokenHash` query for grants keyed by token.
 *
 * @param voided - The voided-purchase notification.
 * @returns The stored grant, or `null` when no purchase matches.
 */
export async function findGrantForVoid(
  voided: VoidedPurchaseNotification,
): Promise<StoredGrant | null> {
  const db = getAdminDb();

  if (voided.orderId) {
    const byOrder = await db
      .collection(GRANTS)
      .doc(`google-play:${voided.orderId}`)
      .get();
    if (byOrder.exists) {
      return { ...(byOrder.data() as StoredGrant), id: byOrder.id };
    }
  }

  const snapshot = await db
    .collection(GRANTS)
    .where("purchaseTokenHash", "==", purchaseTokenHash(voided.purchaseToken))
    .limit(1)
    .get();
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { ...(doc.data() as StoredGrant), id: doc.id };
  }

  return null;
}

/** The policy function {@link applyVoidedPurchase} consults. */
export type VoidRemediationPlanner = (
  input: VoidRemediationInput,
) => VoidRemediationPlan;

/**
 * Apply a voided purchase to the account that received the grant.
 *
 * Idempotent on the grant's `voidedAt` marker, so a redelivered notification
 * for an already-voided purchase is a no-op rather than a second clawback.
 *
 * @param voided - The voided-purchase notification from Play.
 * @param planner - Clawback policy; defaults to {@link planVoidRemediation}.
 *   Injectable so tests can exercise the Firestore work independently of the
 *   policy, the same way `verifyAndGrantPurchase` takes a verifier.
 * @returns What happened, for logging and for the route's response.
 */
export async function applyVoidedPurchase(
  voided: VoidedPurchaseNotification,
  planner: VoidRemediationPlanner = planVoidRemediation,
): Promise<ApplyVoidOutcome> {
  const grant = await findGrantForVoid(voided);
  if (!grant) {
    // Nothing to claw back. Common for purchases made before RTDN was enabled,
    // or for a package/environment mismatch. Ack it — retrying will not help.
    return { status: "unmatched", orderId: voided.orderId };
  }

  const db = getAdminDb();
  const grantRef = db.collection(GRANTS).doc(grant.id);
  const builderRef = db.collection(BUILDERS).doc(grant.uid);
  const certBalanceRef = db.collection(CERTIFICATE_CREDITS).doc(grant.uid);
  const certUnlockRef = grant.certKey
    ? db.collection(CERTIFICATE_PURCHASES).doc(purchaseId(grant.uid, grant.certKey))
    : null;

  const result = await db.runTransaction(async (tx) => {
    const grantSnap = await tx.get(grantRef);
    if (!grantSnap.exists) return { status: "unmatched" as const };

    const current = grantSnap.data() as StoredGrant;
    if (current.voidedAt) {
      return { status: "replay" as const };
    }

    const builderSnap = await tx.get(builderRef);
    const currentLeadCredits =
      builderSnap.exists && typeof builderSnap.data()?.credits === "number"
        ? (builderSnap.data()?.credits as number)
        : 0;

    const plan = planner({
      grant: { ...current, id: grant.id },
      fullRefund: voided.refundType !== undefined
        ? voided.refundType === REFUND_TYPE_FULL
        : true,
      currentLeadCredits,
      hasCertificateUnlock: Boolean(current.certKey),
    });

    tx.update(grantRef, {
      voidedAt: new Date().toISOString(),
      voidedAtServer: FieldValue.serverTimestamp(),
      voidReason: plan.reason,
      voidOrderId: voided.orderId,
      voidRefundType: voided.refundType ?? null,
      revokedLeadCredits: plan.leadCreditsToRevoke,
      revokedCertificateCredits: plan.certificateCreditsToRevoke,
    });

    if (plan.leadCreditsToRevoke > 0 && builderSnap.exists) {
      const next = plan.allowNegativeBalance
        ? currentLeadCredits - plan.leadCreditsToRevoke
        : Math.max(0, currentLeadCredits - plan.leadCreditsToRevoke);
      tx.update(builderRef, {
        credits: next,
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Mirror the builder ledger the Stripe webhook writes, so support sees
      // refunds and purchases in one place.
      tx.set(
        builderRef.collection("ledger").doc(`void_${grant.id.replace(/[/]/g, "_")}`),
        {
          type: "refund",
          creditsChange: next - currentLeadCredits,
          reason: plan.reason,
          orderId: voided.orderId,
          createdAt: FieldValue.serverTimestamp(),
        },
      );
    }

    if (plan.certificateCreditsToRevoke > 0) {
      tx.set(
        certBalanceRef,
        {
          uid: current.uid,
          balance: FieldValue.increment(-plan.certificateCreditsToRevoke),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    // Certificate access is gated on document existence (lib/certificate-access.ts),
    // so re-locking requires deleting the doc — a status flag would not work.
    if (plan.revokeCertificateUnlock && certUnlockRef) {
      tx.delete(certUnlockRef);
    }

    return { status: "applied" as const, plan };
  });

  if (result.status === "unmatched") {
    return { status: "unmatched", orderId: voided.orderId };
  }
  if (result.status === "replay") {
    return { status: "replay", grantId: grant.id };
  }
  return { status: "applied", grantId: grant.id, plan: result.plan };
}
