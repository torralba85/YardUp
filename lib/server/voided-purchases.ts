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
 * Policy (2026-11-25): floor credit balances at zero (`allowNegativeBalance:
 * false`) and record any unrecovered shortfall on the grant and refund ledger
 * for support/abuse visibility. Full refunds revoke unused lead credits,
 * multi-credit certificate balances, and single-lot certificate unlocks.
 * Quantity-based partial refunds are recorded for manual review without
 * automated clawback so we never over-revoke.
 *
 * @param input - The grant, refund type, and current balances.
 * @returns The plan {@link applyVoidedPurchase} will execute.
 */
export function planVoidRemediation(
  input: VoidRemediationInput,
): VoidRemediationPlan {
  if (!input.fullRefund) {
    return {
      leadCreditsToRevoke: 0,
      certificateCreditsToRevoke: 0,
      revokeCertificateUnlock: false,
      allowNegativeBalance: false,
      reason: "partial-refund-manual-review",
    };
  }

  return {
    leadCreditsToRevoke: Math.max(0, input.grant.credits),
    // Single-lot certificate purchases unlock `certificatePurchases/{uid}_{certKey}`
    // directly without incrementing `certificateCredits/{uid}.balance`.
    certificateCreditsToRevoke: input.hasCertificateUnlock
      ? 0
      : Math.max(0, input.grant.certificateCredits),
    revokeCertificateUnlock: input.hasCertificateUnlock,
    allowNegativeBalance: false,
    reason: "full-refund-floor-zero",
  };
}

export interface VoidShortfall {
  leadCredits: number;
  certificateCredits: number;
}

export type ApplyVoidOutcome =
  | {
      status: "applied";
      grantId: string;
      plan: VoidRemediationPlan;
      shortfall: VoidShortfall;
    }
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

    const [builderSnap, certBalanceSnap] = await Promise.all([
      tx.get(builderRef),
      tx.get(certBalanceRef),
    ]);
    const currentLeadCredits =
      builderSnap.exists && typeof builderSnap.data()?.credits === "number"
        ? (builderSnap.data()?.credits as number)
        : 0;
    const currentCertCredits =
      certBalanceSnap.exists && typeof certBalanceSnap.data()?.balance === "number"
        ? (certBalanceSnap.data()?.balance as number)
        : 0;

    const plan = planner({
      grant: { ...current, id: grant.id },
      fullRefund: voided.refundType !== undefined
        ? voided.refundType === REFUND_TYPE_FULL
        : true,
      currentLeadCredits,
      hasCertificateUnlock: Boolean(current.certKey),
    });

    let actualLeadRevoked = 0;
    let leadCreditShortfall = 0;
    let nextLeadCredits = currentLeadCredits;
    if (plan.leadCreditsToRevoke > 0) {
      if (builderSnap.exists) {
        nextLeadCredits = plan.allowNegativeBalance
          ? currentLeadCredits - plan.leadCreditsToRevoke
          : Math.min(
              currentLeadCredits,
              Math.max(0, currentLeadCredits - plan.leadCreditsToRevoke),
            );
        actualLeadRevoked = Math.max(0, currentLeadCredits - nextLeadCredits);
        leadCreditShortfall = Math.max(0, plan.leadCreditsToRevoke - actualLeadRevoked);
      } else {
        leadCreditShortfall = plan.leadCreditsToRevoke;
      }
    }

    let actualCertRevoked = 0;
    let certificateCreditShortfall = 0;
    let nextCertCredits = currentCertCredits;
    if (plan.certificateCreditsToRevoke > 0) {
      nextCertCredits = plan.allowNegativeBalance
        ? currentCertCredits - plan.certificateCreditsToRevoke
        : Math.min(
            currentCertCredits,
            Math.max(0, currentCertCredits - plan.certificateCreditsToRevoke),
          );
      actualCertRevoked = Math.max(0, currentCertCredits - nextCertCredits);
      certificateCreditShortfall = Math.max(
        0,
        plan.certificateCreditsToRevoke - actualCertRevoked,
      );
    }

    tx.update(grantRef, {
      voidedAt: new Date().toISOString(),
      voidedAtServer: FieldValue.serverTimestamp(),
      voidReason: plan.reason,
      voidOrderId: voided.orderId,
      voidRefundType: voided.refundType ?? null,
      revokedLeadCredits: actualLeadRevoked,
      leadCreditShortfall,
      revokedCertificateCredits: actualCertRevoked,
      certificateCreditShortfall,
      revokedCertificateUnlock: Boolean(plan.revokeCertificateUnlock && certUnlockRef),
    });

    if (plan.leadCreditsToRevoke > 0 && builderSnap.exists) {
      tx.update(builderRef, {
        credits: nextLeadCredits,
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Mirror the builder ledger the Stripe webhook writes, so support sees
      // refunds, clawbacks, and any unrecovered shortfall in one place.
      tx.set(
        builderRef.collection("ledger").doc(`void_${grant.id.replace(/[/]/g, "_")}`),
        {
          type: "refund",
          creditsChange: -actualLeadRevoked,
          requestedRevokeCredits: plan.leadCreditsToRevoke,
          shortfall: leadCreditShortfall,
          reason: plan.reason,
          orderId: voided.orderId,
          createdAt: FieldValue.serverTimestamp(),
        },
      );
    }

    if (plan.certificateCreditsToRevoke > 0 && (certBalanceSnap.exists || plan.allowNegativeBalance)) {
      tx.set(
        certBalanceRef,
        {
          uid: current.uid,
          balance: nextCertCredits,
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

    return {
      status: "applied" as const,
      plan,
      shortfall: {
        leadCredits: leadCreditShortfall,
        certificateCredits: certificateCreditShortfall,
      },
    };
  });

  if (result.status === "unmatched") {
    return { status: "unmatched", orderId: voided.orderId };
  }
  if (result.status === "replay") {
    return { status: "replay", grantId: grant.id };
  }
  if (result.shortfall.leadCredits > 0 || result.shortfall.certificateCredits > 0) {
    console.warn("[voided-purchases] credit clawback shortfall recorded", {
      grantId: grant.id,
      uid: grant.uid,
      orderId: voided.orderId,
      shortfall: result.shortfall,
    });
  }
  return {
    status: "applied",
    grantId: grant.id,
    plan: result.plan,
    shortfall: result.shortfall,
  };
}
