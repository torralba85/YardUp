/**
 * A guest's certificate purchase click, carried across the account step.
 *
 * Signing in can remount the Studio (`/studio` swaps to `SignedInStudioGate`
 * for a real address) or leave the page entirely (redirect-based Google/Apple
 * sign-in on Android), so component state cannot hold the intent. It lives in
 * this tab's sessionStorage, expires after {@link PURCHASE_INTENT_TTL_MS}, and
 * is consumed once by the certificate panel. It holds only the certificate key
 * (the same address slug already stashed with the session's parcel), no
 * account or payment data.
 */

const INTENT_KEY = "lf:certificate-purchase-intent";
const CAPTURED_EMAIL_KEY = "lotfoundry_captured_email";

/** An editable convenience hint only; never an authenticated identity or a purchase intent. */
export function rememberCapturedEmail(email: string): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(CAPTURED_EMAIL_KEY, email.trim().toLowerCase()); } catch { /* Optional prefill. */ }
}

export function readCapturedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const email = window.sessionStorage.getItem(CAPTURED_EMAIL_KEY) ?? "";
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  } catch { return ""; }
}

/** How long a purchase click stays resumable while the visitor signs in. */
export const PURCHASE_INTENT_TTL_MS = 30 * 60 * 1000;

interface StoredIntent {
  certKey: string;
  createdAt: number;
}

// Same-page fallback when sessionStorage throws (private/restricted modes).
let inMemoryIntent: StoredIntent | null = null;

/** Record that the visitor chose to buy the certificate for `certKey`. */
export function rememberCertificatePurchaseIntent(certKey: string, now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  const intent: StoredIntent = { certKey, createdAt: now };
  inMemoryIntent = intent;
  try {
    window.sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch {
    // The in-memory fallback above still covers an in-place sign-in.
  }
}

/**
 * Whether an unexpired purchase intent is pending — for `certKey` when given,
 * or for any certificate otherwise (used to open the Certificate step).
 */
export function hasCertificatePurchaseIntent(certKey?: string, now: number = Date.now()): boolean {
  const intent = readIntent();
  if (!intent) return false;
  const age = now - intent.createdAt;
  if (age < 0 || age > PURCHASE_INTENT_TTL_MS) return false;
  return certKey === undefined || intent.certKey === certKey;
}

/** Forget the pending intent (consumed, dismissed, or not resumable). */
export function clearCertificatePurchaseIntent(): void {
  inMemoryIntent = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function readIntent(): StoredIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(INTENT_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (isStoredIntent(value)) return value;
    }
  } catch {
    // Fall through to the in-memory fallback.
  }
  return inMemoryIntent;
}

function isStoredIntent(value: unknown): value is StoredIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as Partial<StoredIntent>;
  return typeof intent.certKey === "string" && intent.certKey.length > 0 && typeof intent.createdAt === "number";
}
