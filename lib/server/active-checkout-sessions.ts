import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

const ACTIVE_CHECKOUT_SESSIONS = "activeCheckoutSessions";
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type CheckoutPurchaseType = "certificate" | "lead_unlock";

export interface ActiveCheckoutSession {
  attemptId: string;
  parameters: Record<string, string>;
  sessionId?: string;
  sessionUrl?: string;
  expiresAtMs: number;
}

export interface ReserveActiveCheckoutInput {
  purchaseType: CheckoutPurchaseType;
  accountId: string;
  purchaseId: string;
  attemptId: string;
  parameters: Record<string, string>;
}

/**
 * Reserve one resumable Stripe Checkout session per entitlement. The document
 * id is hashed so internal account and parcel identifiers do not appear in
 * the collection's document paths.
 */
export async function reserveActiveCheckout(
  input: ReserveActiveCheckoutInput,
): Promise<ActiveCheckoutSession> {
  const ref = getReservationRef(input);
  const now = Date.now();

  return getAdminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = readActiveCheckout(snap.data());
    // A saved Session may have completed while its webhook is still pending.
    // Only Stripe's status can authorize replacing it, even past local expiry.
    if (existing && (existing.sessionId || existing.expiresAtMs > now)) return existing;

    const reservation = newReservation(input, input.attemptId, now);
    transaction.set(ref, reservationDocument(input, reservation));
    return reservation;
  });
}

/**
 * Replace a reservation only after Stripe has confirmed the stored Checkout
 * Session is expired. A transaction prevents two tabs from minting separate
 * replacements for the same entitlement.
 */
export async function replaceExpiredActiveCheckout(
  input: ReserveActiveCheckoutInput,
  expiredAttemptId: string,
): Promise<ActiveCheckoutSession> {
  const ref = getReservationRef(input);
  const now = Date.now();

  return getAdminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = readActiveCheckout(snap.data());
    if (!existing || existing.attemptId !== expiredAttemptId) {
      if (!existing) {
        const reservation = newReservation(input, input.attemptId, now);
        transaction.set(ref, reservationDocument(input, reservation));
        return reservation;
      }
      return existing;
    }

    const replacement = newReservation(input, randomUUID(), now);
    transaction.set(ref, reservationDocument(input, replacement));
    return replacement;
  });
}

/**
 * Persist a newly created Checkout Session before returning its URL. If a
 * concurrent request has already replaced this attempt, return that current
 * reservation instead so the stale session is never handed to a buyer.
 */
export async function saveActiveCheckoutSession(
  input: ReserveActiveCheckoutInput,
  reservation: ActiveCheckoutSession,
  session: { id: string; url: string; expiresAtMs?: number },
): Promise<ActiveCheckoutSession> {
  const ref = getReservationRef(input);

  return getAdminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = readActiveCheckout(snap.data());
    if (!current || current.attemptId !== reservation.attemptId) {
      return current ?? reservation;
    }

    const expiresAtMs = session.expiresAtMs ?? current.expiresAtMs;
    transaction.update(ref, {
      sessionId: session.id,
      sessionUrl: session.url,
      expiresAt: Timestamp.fromMillis(expiresAtMs),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ...current, sessionId: session.id, sessionUrl: session.url, expiresAtMs };
  });
}

function getReservationRef(input: ReserveActiveCheckoutInput) {
  const digest = createHash("sha256")
    .update(
      JSON.stringify([input.purchaseType, input.accountId, input.purchaseId]),
    )
    .digest("hex");
  return getAdminDb().collection(ACTIVE_CHECKOUT_SESSIONS).doc(digest);
}

function newReservation(
  input: ReserveActiveCheckoutInput,
  attemptId: string,
  now: number,
): ActiveCheckoutSession {
  return {
    attemptId,
    parameters: input.parameters,
    expiresAtMs: now + DEFAULT_SESSION_TTL_MS,
  };
}

function reservationDocument(
  input: ReserveActiveCheckoutInput,
  reservation: ActiveCheckoutSession,
) {
  return {
    // Keep the owner queryable so account deletion can remove reservations
    // containing checkout presentation data before deleting Auth.
    accountId: input.accountId,
    purchaseType: input.purchaseType,
    attemptId: reservation.attemptId,
    parameters: reservation.parameters,
    expiresAt: Timestamp.fromMillis(reservation.expiresAtMs),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function readActiveCheckout(
  data: Record<string, unknown> | undefined,
): ActiveCheckoutSession | null {
  if (!data || typeof data.attemptId !== "string") return null;
  const expiresAtMs = toMillis(data.expiresAt);
  if (!expiresAtMs) return null;

  return {
    attemptId: data.attemptId,
    parameters: stringRecord(data.parameters),
    ...(typeof data.sessionId === "string" ? { sessionId: data.sessionId } : {}),
    ...(typeof data.sessionUrl === "string"
      ? { sessionUrl: data.sessionUrl }
      : {}),
    expiresAtMs,
  };
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );
}

function toMillis(value: unknown): number {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as { toMillis?: unknown }).toMillis !== "function"
  ) {
    return 0;
  }
  return (value as { toMillis: () => number }).toMillis();
}
