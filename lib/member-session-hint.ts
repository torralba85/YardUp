/**
 * Client-only marker recording that this browser has signed in at least once.
 *
 * The landing page renders outside the `(firebase)` route group so that a guest
 * visit never downloads the Firebase client SDK (see `app/(firebase)/layout.tsx`).
 * The landing's member navigation needs `useAuth`, and asking Firebase whether a
 * session exists means paying that download on every visit — roughly 680 KB of
 * JavaScript for the overwhelming majority of visitors, who are signed out.
 *
 * This marker answers the same question without the SDK. `AuthProvider` writes
 * it when a session resolves and clears it on sign-out or account deletion, so
 * the landing can decide whether to mount its auth island before loading any
 * Firebase code.
 *
 * It is a hint, not an authority: it holds no identity, no token, and no
 * personal data, and nothing is authorized by its presence. A stale marker only
 * costs a returning visitor the SDK download that `AuthProvider` then resolves
 * to a signed-out state; a missing one only shows a member the `Sign in` link,
 * which still carries them into their existing session.
 *
 * Local storage is the right store here precisely because it shares the origin
 * and lifetime of Firebase's own IndexedDB session record: clearing site data
 * drops both together, so the marker cannot outlive the session it describes.
 */

const MEMBER_SESSION_KEY = "lf:member-session";

/**
 * Record that this browser holds a resolved member session.
 *
 * Never throws — when local storage is unavailable (private mode, quota, or a
 * blocking cookie policy) the hint is simply skipped and the landing keeps
 * showing the `Sign in` link.
 */
export function rememberMemberSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMBER_SESSION_KEY, "1");
  } catch {
    // Storage disabled or full — degrade to the signed-out landing header.
  }
}

/**
 * Clear the marker when a session ends (sign-out or account deletion).
 *
 * Must run before the sign-out redirect, so the landing it lands on already
 * reads as signed out.
 */
export function forgetMemberSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MEMBER_SESSION_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/**
 * Subscribe to changes in the marker, for `useSyncExternalStore`.
 *
 * Only another tab's writes arrive as `storage` events, which is the case worth
 * hearing about: signing out in one tab should drop the member navigation in
 * every other one rather than leave it advertising a session that has ended.
 *
 * @param onChange - Callback React supplies to request a re-read.
 * @returns The unsubscribe function.
 */
export function subscribeMemberSession(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    // A null key means the whole store was cleared, which counts as a change.
    if (event.key === null || event.key === MEMBER_SESSION_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

/**
 * Report whether this browser has a member session worth resolving.
 *
 * @returns `true` only when the marker is present. Server rendering and
 *   unavailable storage both report `false`, which keeps the prerendered
 *   landing header on its Firebase-free `Sign in` link.
 */
export function hasMemberSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MEMBER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
