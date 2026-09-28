import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { purchaseId } from "../certificate-purchases-id";

const CERTIFICATE_PURCHASES = "certificatePurchases";

/** Firestore caps a document at 1MB; keep parcel snapshots well under it so
 * an oversized payload can never fail a grant after payment succeeded. */
const MAX_PARCEL_DATA_JSON_LEN = 200_000;

/** Parcel snapshots ride along opportunistically — drop (never fail on)
 * payloads too large or unserializable to store safely. Recovery falls back
 * to the saved address. */
function isStorableParcelData(parcelData: Record<string, unknown>): boolean {
  let serialized: string;
  try {
    serialized = JSON.stringify(parcelData);
  } catch {
    return false;
  }
  if (serialized.length > MAX_PARCEL_DATA_JSON_LEN) {
    console.warn(
      `[certificate-purchases] Dropping oversized parcelData (${serialized.length} chars, cap ${MAX_PARCEL_DATA_JSON_LEN}).`,
    );
    return false;
  }
  return true;
}

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
  /** Opaque random analytics order ID (safe transaction_id for GA4 / Google Ads). */
  analyticsOrderId?: string;
  /** Whether this is a demo (non-paid) grant. */
  demo?: boolean;
  /** Display name of the lot. */
  parcelName?: string;
  /** Street address of the property. */
  address?: string;
  /** City of the property. */
  city?: string;
  /** State of the property. */
  state?: string;
  /** Postal code. */
  zip?: string;
  /** Latitude coordinate. */
  lat?: number;
  /** Longitude coordinate. */
  lng?: number;
  /** Structured live parcel data when available. */
  parcelData?: Record<string, unknown>;
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
    const docData: Record<string, unknown> = {
      uid: input.uid,
      certKey: input.certKey,
      stripeSessionId: input.stripeSessionId,
      amount: input.amount,
      status: "granted",
      demo: input.demo ?? false,
      analyticsOrderId: input.analyticsOrderId ?? randomUUID(),
      createdAt: FieldValue.serverTimestamp(),
    };
    if (input.parcelName) docData.parcelName = input.parcelName;
    if (input.address) docData.address = input.address;
    if (input.city) docData.city = input.city;
    if (input.state) docData.state = input.state;
    if (input.zip) docData.zip = input.zip;
    if (Number.isFinite(input.lat)) docData.lat = input.lat;
    if (Number.isFinite(input.lng)) docData.lng = input.lng;
    if (input.parcelData && isStorableParcelData(input.parcelData)) {
      docData.parcelData = input.parcelData;
    }

    await ref.create(docData);
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
