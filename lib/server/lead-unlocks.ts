import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { stripeCheckoutRecord } from "./stripe-checkout-record";

const LEAD_UNLOCKS = "leadUnlocks";
const HEAD_START_MS = 48 * 60 * 60 * 1000;

export function unlockId(builderId: string, requestId: string): string {
  return `${builderId}_${requestId}`;
}

export interface GrantLeadUnlockInput {
  builderId: string;
  requestId: string;
  stripeSessionId: string;
  amount: number;
  demo?: boolean;
}

type LeadBlockReason = "lead_unavailable" | "exclusive_window" | "already_unlocked";

export type LeadGrantOutcome =
  | { status: "granted" | "replay" | "reversed" }
  | { status: "blocked"; reason: LeadBlockReason; refundId?: string; refundStatus?: string };

function blockReason(
  lead: FirebaseFirestore.DocumentData | undefined,
  grantExists: boolean,
  builderId: string,
  now: number,
): LeadBlockReason | undefined {
  if (grantExists) return "already_unlocked";
  if (lead?.status !== "submitted" || !Array.isArray(lead.matchedBuilderIds) ||
      !lead.matchedBuilderIds.includes(builderId)) return "lead_unavailable";
  if (lead.firstUnlockedBy && lead.firstUnlockedBy !== builderId &&
      Date.parse(lead.headStartUntil) > now) return "exclusive_window";
}

/**
 * Grant access and set the first builder's window in the same transaction.
 * The credit unlock route also reads and writes the lead document, so the
 * first committed unlock wins across both payment methods.
 */
export async function grantLeadUnlock(input: GrantLeadUnlockInput): Promise<LeadGrantOutcome> {
  const { builderId, requestId, stripeSessionId } = input;
  const db = getAdminDb();
  const grantRef = db.collection(LEAD_UNLOCKS).doc(unlockId(builderId, requestId));
  const leadRef = db.collection("connectionRequests").doc(requestId);
  const record = input.demo ? null : stripeCheckoutRecord(db, stripeSessionId);

  return db.runTransaction(async (tx): Promise<LeadGrantOutcome> => {
    // Read the shared lead first so lead and credit payments contend on the
    // same document before reading their per-builder grants.
    const lead = await tx.get(leadRef);
    const [grant, checkout] = await Promise.all([
      tx.get(grantRef),
      record ? tx.get(record) : undefined,
    ]);
    const data = checkout?.data();
    if (data?.reversedAt) return { status: "reversed" };
    if (data?.leadRefundReason) {
      return {
        status: "blocked",
        reason: data.leadRefundReason,
        refundId: data.leadRefundId,
        refundStatus: data.leadRefundStatus,
      };
    }
    if (grant.exists && (grant.data()?.stripeSessionId === stripeSessionId || input.demo)) {
      return { status: "replay" };
    }

    const now = Date.now();
    const leadData = lead.data();
    const reason = blockReason(leadData, grant.exists, builderId, now);
    if (reason) {
      if (record) {
        tx.set(record, {
          purchaseType: "lead_unlock",
          leadRefundReason: reason,
          leadRefundRequestedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return { status: "blocked", reason };
    }

    tx.create(grantRef, {
      builderId, requestId, stripeSessionId,
      amount: input.amount,
      status: "granted",
      demo: input.demo ?? false,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (!leadData?.headStartUntil) {
      tx.update(leadRef, {
        headStartUntil: new Date(now + HEAD_START_MS).toISOString(),
        firstUnlockedBy: builderId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { status: "granted" };
  });
}

export async function isLeadUnlocked(builderId: string, requestId: string): Promise<boolean> {
  const snap = await getAdminDb()
    .collection(LEAD_UNLOCKS)
    .doc(unlockId(builderId, requestId))
    .get();
  return snap.exists;
}