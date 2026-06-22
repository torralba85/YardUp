import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

const LEAD_UNLOCKS = "leadUnlocks";

/** Deterministic grant id — `{builderId}_{requestId}` — is the idempotency key
 * (2A). A replayed Stripe webhook targets the same doc and no-ops. */
export function unlockId(builderId: string, requestId: string): string {
  return `${builderId}_${requestId}`;
}

/** Fields needed to record a paid lead-unlock grant. */
export interface GrantLeadUnlockInput {
  /** The builder receiving the unlock. */
  builderId: string;
  /** The connection request being unlocked. */
  requestId: string;
  /** The Stripe Checkout session id that paid for the unlock. */
  stripeSessionId: string;
  /** Amount paid, in cents. */
  amount: number;
  /** Whether this is a demo (non-paid) grant. */
  demo?: boolean;
}

/**
 * Write the paid-unlock grant via the Admin SDK (which bypasses the
 * leadUnlocks "no client write" rule). Uses `create()` so a replay or Stripe
 * retry hits an ALREADY_EXISTS and is swallowed — the grant is written exactly
 * once and never re-stamped. Returns true if this call created the grant,
 * false if it already existed.
 */
export async function grantLeadUnlock(
  input: GrantLeadUnlockInput,
): Promise<boolean> {
  const ref = getAdminDb()
    .collection(LEAD_UNLOCKS)
    .doc(unlockId(input.builderId, input.requestId));

  try {
    await ref.create({
      builderId: input.builderId,
      requestId: input.requestId,
      stripeSessionId: input.stripeSessionId,
      amount: input.amount,
      status: "granted",
      demo: input.demo ?? false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err) {
    if (isAlreadyExists(err)) return false;
    throw err;
  }
}

/**
 * Check whether a builder already holds an unlock grant for a lead.
 *
 * @param builderId - The builder's id.
 * @param requestId - The connection request id.
 * @returns `true` if a grant document exists.
 */
export async function isLeadUnlocked(
  builderId: string,
  requestId: string,
): Promise<boolean> {
  const snap = await getAdminDb()
    .collection(LEAD_UNLOCKS)
    .doc(unlockId(builderId, requestId))
    .get();
  return snap.exists;
}

/** Firestore Admin throws code 6 / "already-exists" when create() hits an
 * existing doc — the idempotency signal, not a real failure. */
function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: number | string } | null)?.code;
  return code === 6 || code === "already-exists";
}
