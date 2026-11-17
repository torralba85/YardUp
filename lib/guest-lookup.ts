/**
 * Client-only allowance for anonymous ("guest") real-address lookups.
 *
 * A visitor who has never signed in gets {@link GUEST_LOOKUP_LIMIT} real
 * address lookups before the studio asks them to sign in. This exists because
 * an account wall in front of the first lookup costs every cold visitor: the
 * product's whole claim is "check your address", and a stranger will not create
 * an account to find out whether the claim holds.
 *
 * The allowance is a funnel affordance, not a security control. It is stored in
 * the visitor's own browser and is trivially cleared; the real cost ceiling is
 * server-side — `/api/geocode` and `/api/parcel` route tokenless callers onto
 * the keyless provider chain (Nominatim, county/statewide GIS) under their own
 * rate-limit namespaces, so an anonymous lookup cannot spend metered quota
 * however many times it is repeated.
 *
 * Only a count is stored. Per the project privacy rule, a guest's searched
 * address is never persisted here — see `address-handoff.ts` for the separate,
 * consume-once, tab-scoped handoff of the address itself.
 */

const GUEST_LOOKUP_KEY = "lf:guest-lookups";

/**
 * How many real-address lookups an anonymous visitor may run before signing in.
 *
 * Three, per the approved growth plan: enough for a visitor to test their lot
 * (and compare another property or fix a typo) without an account wall, while
 * keeping the server-side `geocode-guest` / `parcel-guest` rate limiters as the
 * actual cost ceiling.
 */
export const GUEST_LOOKUP_LIMIT = 3;

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(GUEST_LOOKUP_KEY);
    const parsed = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    // Storage disabled (private mode, blocked cookies) — treat as unused. The
    // server-side guest limits still hold, so a visitor who cannot persist the
    // count gets lookups rather than a wall.
    return 0;
  }
}

/**
 * How many anonymous lookups this browser has left.
 *
 * @returns A count between 0 and {@link GUEST_LOOKUP_LIMIT}.
 */
export function guestLookupsRemaining(): number {
  return Math.max(0, GUEST_LOOKUP_LIMIT - readCount());
}

/** Whether an anonymous visitor may run another real-address lookup. */
export function canGuestLookup(): boolean {
  return guestLookupsRemaining() > 0;
}

/**
 * Record that an anonymous lookup was spent.
 *
 * Called only after a lookup actually resolves. A failed geocode or an
 * unreachable parcel service must not burn one of the visitor's free tries.
 */
export function consumeGuestLookup(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_LOOKUP_KEY, String(readCount() + 1));
  } catch {
    // Storage disabled — the allowance simply does not persist.
  }
}

/**
 * Clear the allowance. Used after sign-in, so a returning visitor who signs up
 * and later signs out is not left permanently spent, and by tests.
 */
export function resetGuestLookups(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_LOOKUP_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
