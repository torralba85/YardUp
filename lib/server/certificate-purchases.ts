import { randomUUID } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { CERTIFICATE_PRICE_CENTS } from "../certificate-pricing";
import { getStripe } from "../stripe";
import { getAdminApp, getAdminDb } from "./firebase-admin";
import { purchaseId } from "../certificate-purchases-id";
import { hasExpectedPayment } from "./stripe-payment-guard";

const CERTIFICATE_PURCHASES = "certificatePurchases";
const CERTIFICATE_TRANSFERS = "certificateTransfers";

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
  /** Lowercased email collected by Stripe Checkout for verified-email recovery. */
  buyerEmail?: string;
  /** Whether the checkout originated from an anonymous Firebase session. */
  anonymousCheckout?: boolean;
  /** Terms version accepted before purchase. */
  consentVersion?: string;
  /** Privacy policy version accepted before purchase. */
  privacyVersion?: string;
  /** ISO-8601 timestamp when legal consent was confirmed for this checkout. */
  consentAcceptedAt?: string;
}

/** The grant document's Firestore ref, at the deterministic `{uid}_{certKey}` id. */
export function certificateGrantRef(uid: string, certKey: string) {
  return getAdminDb()
    .collection(CERTIFICATE_PURCHASES)
    .doc(purchaseId(uid, certKey));
}

/** The grant document fields, shared by paid grants and agent-pass grants. */
export function certificateGrantData(input: GrantCertificateInput): Record<string, unknown> {
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
  const buyerEmail = normalizeEmail(input.buyerEmail);
  if (buyerEmail) docData.buyerEmail = buyerEmail;
  if (input.anonymousCheckout) docData.anonymousCheckout = true;
  if (input.consentVersion) docData.consentVersion = input.consentVersion;
  if (input.privacyVersion) docData.privacyVersion = input.privacyVersion;
  if (input.consentAcceptedAt) docData.consentAcceptedAt = input.consentAcceptedAt;
  return docData;
}

/**
 * Write the certificate grant via the Admin SDK (which bypasses the
 * `certificatePurchases` "no client write" rule). Atomically checks the grant
 * and transfer ledger so Stripe retries cannot restore a recovered grant to
 * its former owner. Returns true only when this call creates a new grant.
 */
export async function grantCertificate(
  input: GrantCertificateInput,
): Promise<boolean> {
  const ref = certificateGrantRef(input.uid, input.certKey);

  const db = getAdminDb();
  const transferRef = db.collection(CERTIFICATE_TRANSFERS).doc(encodeURIComponent(input.stripeSessionId));
  return db.runTransaction(async (tx) => {
    const [grant, transfer] = await Promise.all([tx.get(ref), tx.get(transferRef)]);
    // Keep the original payment consumed after recovery. A delayed webhook or
    // Checkout reconciliation must never recreate the former owner's grant.
    if (grant.exists || transfer.exists) return false;
    tx.create(ref, certificateGrantData(input));
    return true;
  });
}

function metadataNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Build the grant input from a paid Checkout Session alone. The webhook and the
 * checkout-certificate retry both use this, so whichever runs first writes the
 * identical Grant. Only Session data is read (never request or reservation
 * state); legacy Sessions simply lack the optional metadata keys.
 */
export function certificateGrantInputFromSession(session: {
  id: string;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}): GrantCertificateInput | null {
  const metadata = session.metadata ?? {};
  const { uid, certKey } = metadata;
  if (!uid || !certKey) return null;
  const buyerEmail = normalizeEmail(
    session.customer_details?.email ?? session.customer_email,
  );
  return {
    uid,
    certKey,
    stripeSessionId: session.id,
    amount: CERTIFICATE_PRICE_CENTS,
    parcelName: metadata.parcelName || undefined,
    address: metadata.address || undefined,
    city: metadata.city || undefined,
    state: metadata.state || undefined,
    zip: metadata.zip || undefined,
    lat: metadataNumber(metadata.lat),
    lng: metadataNumber(metadata.lng),
    ...(buyerEmail ? { buyerEmail } : {}),
    ...(metadata.anonymousCheckout === "true" ? { anonymousCheckout: true } : {}),
    ...(metadata.consentVersion
      ? {
          consentVersion: metadata.consentVersion,
          privacyVersion: metadata.privacyVersion,
          consentAcceptedAt: metadata.consentAcceptedAt,
        }
      : {}),
  };
}

/**
 * Fulfil a paid certificate Session (shared by webhook and retry). Callers own
 * auth and trust checks (paid status, amount, owner). Goes through
 * `grantCertificate`'s transaction, so replays and recovered grants no-op.
 * Returns the grant result, or null when metadata lacks uid/certKey.
 */
export async function fulfillPaidCertificateSession(
  session: Parameters<typeof certificateGrantInputFromSession>[0],
): Promise<boolean | null> {
  const input = certificateGrantInputFromSession(session);
  if (!input) return null;
  return grantCertificate(input);
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

/**
 * Check whether a user's certificate grant for a lot was recovered to another account.
 *
 * @param uid - The former owner's user id.
 * @param certKey - The stable per-lot certificate key.
 * @returns `true` if a grant document exists with `transferredFromUid === uid` for `certKey`.
 */
export async function wasCertificateTransferredFrom(
  uid: string,
  certKey: string,
): Promise<boolean> {
  const snap = await getAdminDb()
    .collection(CERTIFICATE_PURCHASES)
    .where("transferredFromUid", "==", uid)
    .get();
  return snap.docs.some((docSnap) => docSnap.data()?.certKey === certKey);
}

function normalizeEmail(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface ClaimCertificatesInput {
  /** Verified destination account UID receiving the recovered grants. */
  targetUid: string;
  /** Verified email address from the caller's Firebase ID token. */
  verifiedEmail: string;
  /** Optional specific property key to filter the claim. */
  certKey?: string;
}

export interface ClaimCertificatesResult {
  claimedCertKeys: string[];
  alreadyOwnedCertKeys: string[];
}

export class ClaimConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimConfigurationError";
  }
}

export interface ClaimCertificatesDeps {
  retrieveSession?: (
    sessionId: string,
  ) => Promise<Awaited<ReturnType<NonNullable<Awaited<ReturnType<typeof getStripe>>>["checkout"]["sessions"]["retrieve"]>> | null>;
  getAuthUser?: (uid: string) => Promise<{
    email?: string;
    emailVerified?: boolean;
    providerData: Array<{ providerId: string }>;
  } | null>;
}

/**
 * Recover paid Stripe certificate grants matching a caller's verified email and
 * move them transactionally from the original checkout UID (e.g. an anonymous
 * session before browser storage was cleared or after an account-exists
 * collision) to `targetUid`.
 *
 * Security invariants:
 * - Only non-demo Stripe Checkout sessions (`cs_*`) verified directly against
 *   Stripe (`complete` + `paid` + expected USD amount + matching certKey +
 *   matching metadata uid + matching Stripe customer email) may be claimed.
 * - Never steals a grant belonging to another registered user with a different
 *   or unverified email.
 * - Transfers via an atomic, idempotent Firestore transaction creating
 *   `{targetUid}_{certKey}` and deleting `{sourceUid}_{certKey}`.
 */
export async function claimCertificatesByVerifiedEmail(
  input: ClaimCertificatesInput,
  deps: ClaimCertificatesDeps = {},
): Promise<ClaimCertificatesResult> {
  const email = normalizeEmail(input.verifiedEmail);
  if (!email) {
    return { claimedCertKeys: [], alreadyOwnedCertKeys: [] };
  }

  let retrieveSession = deps.retrieveSession;
  if (!retrieveSession) {
    const stripe = await getStripe();
    if (!stripe) {
      throw new ClaimConfigurationError("Payments are not configured.");
    }
    retrieveSession = (id) => stripe.checkout.sessions.retrieve(id);
  }

  const getAuthUser =
    deps.getAuthUser ??
    (async (uid: string) => {
      try {
        return await getAuth(getAdminApp()).getUser(uid);
      } catch (err) {
        if ((err as { code?: string } | null)?.code === "auth/user-not-found") {
          return null;
        }
        throw err;
      }
    });

  const db = getAdminDb();
  const matches = await db
    .collection(CERTIFICATE_PURCHASES)
    .where("buyerEmail", "==", email)
    .get();

  const claimedCertKeys = new Set<string>();
  const alreadyOwnedCertKeys = new Set<string>();

  for (const docSnap of matches.docs) {
    const data = docSnap.data();
    const certKey = typeof data.certKey === "string" ? data.certKey.trim() : "";
    const sourceUid = typeof data.uid === "string" ? data.uid.trim() : "";
    const stripeSessionId =
      typeof data.stripeSessionId === "string" ? data.stripeSessionId.trim() : "";

    if (!certKey || !sourceUid) continue;
    if (input.certKey && certKey !== input.certKey) continue;

    if (sourceUid === input.targetUid) {
      alreadyOwnedCertKeys.add(certKey);
      continue;
    }

    // Never claim demo, native store, or agent pass grants via email recovery.
    if (data.demo === true || !stripeSessionId.startsWith("cs_")) {
      continue;
    }

    // Confirm authoritative payment + email directly from Stripe.
    let session: Awaited<ReturnType<typeof retrieveSession>>;
    try {
      session = await retrieveSession(stripeSessionId);
    } catch {
      // A provider outage is not evidence that the buyer has no purchase.
      throw new Error("Could not verify the payment. Please try recovery again.");
    }
    if (!session) continue;

    const sessionEmail = normalizeEmail(
      session.customer_details?.email ?? session.customer_email,
    );
    if (
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      !hasExpectedPayment(session, CERTIFICATE_PRICE_CENTS, "certificates/claim") ||
      session.metadata?.purchaseType !== "certificate" ||
      session.metadata?.certKey !== certKey ||
      session.metadata?.uid !== sourceUid ||
      sessionEmail !== email
    ) {
      continue;
    }

    // Owner isolation: transfer only from an anonymous session or an account
    // whose own verified email matches the claimant's verified email.
    // anonymousCheckout is historical: the UID may since have been linked.
    const sourceUser = await getAuthUser(sourceUid);
    if (sourceUser && sourceUser.providerData.length > 0) {
      const sourceEmail = normalizeEmail(sourceUser.email);
      if (!sourceUser.emailVerified || sourceEmail !== email) {
        continue;
      }
    }

    const sourceRef = docSnap.ref;
    const targetRef = certificateGrantRef(input.targetUid, certKey);
    const transferRef = db.collection(CERTIFICATE_TRANSFERS).doc(encodeURIComponent(stripeSessionId));

    const outcome = await db.runTransaction(async (tx) => {
      const [sourceInTx, targetInTx, transferInTx] = await Promise.all([
        tx.get(sourceRef),
        tx.get(targetRef),
        tx.get(transferRef),
      ]);

      if (transferInTx.exists) return "skipped" as const;

      if (!sourceInTx.exists) {
        if (
          targetInTx.exists &&
          targetInTx.data()?.stripeSessionId === stripeSessionId
        ) {
          return "claimed" as const;
        }
        return "skipped" as const;
      }

      const current = sourceInTx.data();
      if (
        !current ||
        current.uid !== sourceUid ||
        current.certKey !== certKey ||
        current.stripeSessionId !== stripeSessionId ||
        normalizeEmail(typeof current.buyerEmail === "string" ? current.buyerEmail : undefined) !== email
      ) {
        return "skipped" as const;
      }

      if (targetInTx.exists) {
        if (targetInTx.data()?.stripeSessionId === stripeSessionId) {
          tx.create(transferRef, { targetUid: input.targetUid, stripeSessionId, createdAt: FieldValue.serverTimestamp() });
          tx.delete(sourceRef);
          return "claimed" as const;
        }
        return "already_owned" as const;
      }

      tx.create(targetRef, {
        ...current,
        uid: input.targetUid,
        transferredFromUid: sourceUid,
        claimedAt: FieldValue.serverTimestamp(),
      });
      tx.create(transferRef, { targetUid: input.targetUid, stripeSessionId, createdAt: FieldValue.serverTimestamp() });
      tx.delete(sourceRef);
      return "claimed" as const;
    });

    if (outcome === "claimed") {
      claimedCertKeys.add(certKey);
    } else if (outcome === "already_owned") {
      alreadyOwnedCertKeys.add(certKey);
    }
  }

  return {
    claimedCertKeys: Array.from(claimedCertKeys),
    alreadyOwnedCertKeys: Array.from(alreadyOwnedCertKeys),
  };
}
