import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { purchaseId } from "../certificate-purchases-id";

const CERTIFICATE_PURCHASES = "certificatePurchases";

// The deterministic grant id `{uid}_{certKey}` is the idempotency key — a
// replayed Stripe webhook targets the same doc and no-ops. Defined in a
// client-safe module so the client access hook derives the same id.
export { purchaseId };

/** Fields needed to record a paid certificate-purchase grant. */
export interface GrantCertificateInput {
  /** The user who bought the certificate. */
  uid: string;
  /** The stable per-lot certificate key. */
  certKey: string;
  /** The Stripe Checkout session id that paid for it. */
  stripeSessionId: string;
  /** Amount paid, in cents. */
  amount: number;
  /** Whether this is a demo (non-paid) grant. */
  demo?: boolean;
}

/**
 * Write the certificate grant via the Admin SDK (which bypasses the
 * `certificatePurchases` "no client write" rule). Uses `create()` so a replay or
 * Stripe retry hits ALREADY_EXISTS and is swallowed — the grant is written
 * exactly once and never re-stamped. Returns true if this call created the
 * grant, false if it already existed.
 */
export async function grantCertificate(
  input: GrantCertificateInput,
): Promise<boolean> {
  const ref = getAdminDb()
    .collection(CERTIFICATE_PURCHASES)
    .doc(purchaseId(input.uid, input.certKey));

  try {
    await ref.create({
      uid: input.uid,
      certKey: input.certKey,
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
 * Check whether a user already holds a certificate grant for a lot.
 *
 * @param uid - The user's id.
 * @param certKey - The stable per-lot certificate key.
 * @returns `true` if a grant document exists.
 */
export async function hasCertificate(uid: string, certKey: string): Promise<boolean> {
  const snap = await getAdminDb()
    .collection(CERTIFICATE_PURCHASES)
    .doc(purchaseId(uid, certKey))
    .get();
  return snap.exists;
}

/** Firestore Admin throws code 6 / "already-exists" when create() hits an
 * existing doc — the idempotency signal, not a real failure. */
function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: number | string } | null)?.code;
  return code === 6 || code === "already-exists";
}
