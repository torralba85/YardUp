import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

const LEAD_UNLOCKS = "leadUnlocks";

/** Deterministic grant id — `{builderId}_{requestId}` — is the idempotency key
 * (2A). A replayed Stripe webhook targets the same doc and no-ops. */
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
