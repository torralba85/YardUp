/**
 * Browser-side checkout-attempt persistence.
 *
 * Stripe idempotency must survive a lost response, a second click after return,
 * and another tab. Keep one token per entitlement for the lifetime of the
 * Checkout Session, then rotate it after Stripe's default 24-hour session
 * window so an expired purchase can start again.
 */

export const CHECKOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

type CheckoutKind = "certificate" | "lead_unlock";

interface StoredCheckoutAttempt {
  id: string;
  createdAt: number;
}

const STORAGE_PREFIX = "lf:checkout-attempt:";
const memoryFallback = new Map<string, StoredCheckoutAttempt>();

function storageKey(kind: CheckoutKind, purchaseId: string): string {
  return `${STORAGE_PREFIX}${kind}:${purchaseId}`;
}

function isReusableAttempt(
  value: unknown,
  now: number,
): value is StoredCheckoutAttempt {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCheckoutAttempt>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 100 &&
    typeof candidate.createdAt === "number" &&
    Number.isFinite(candidate.createdAt) &&
    candidate.createdAt <= now &&
    now - candidate.createdAt < CHECKOUT_ATTEMPT_TTL_MS
  );
}

function readStoredAttempt(key: string, now: number): StoredCheckoutAttempt | null {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isReusableAttempt(parsed, now)) return parsed;
        window.localStorage.removeItem(key);
      }
    } catch {
      // Restricted/private storage falls through to the in-memory cache.
    }
  }

  const fallback = memoryFallback.get(key);
  return fallback && isReusableAttempt(fallback, now) ? fallback : null;
}

function saveAttempt(key: string, attempt: StoredCheckoutAttempt): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, JSON.stringify(attempt));
      memoryFallback.delete(key);
      return;
    } catch {
      // Keep retries stable for this page even when storage is blocked.
    }
  }
  memoryFallback.set(key, attempt);
}

/** Return the retry-stable token for one certificate or lead entitlement. */
export function getCheckoutAttemptId(
  kind: CheckoutKind,
  purchaseId: string,
): string {
  const key = storageKey(kind, purchaseId);
  const now = Date.now();
  const existing = readStoredAttempt(key, now);
  if (existing) return existing.id;

  const attempt = { id: crypto.randomUUID(), createdAt: now };
  saveAttempt(key, attempt);
  return attempt.id;
}

/** Remove a completed entitlement's token; it no longer represents active work. */
export function clearCheckoutAttemptId(
  kind: CheckoutKind,
  purchaseId: string,
): void {
  const key = storageKey(kind, purchaseId);
  memoryFallback.delete(key);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort after the server confirms fulfillment.
  }
}
