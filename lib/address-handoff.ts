/**
 * Client-only handoff for the address a guest types into the landing hero.
 *
 * The studio receives the typed address through session storage rather than a
 * URL query parameter. Per the project privacy rule, guest address searches and
 * live parcel data must never be persisted in the URL — doing so leaks the
 * address into browser history, the `Referer` header, and analytics. Session
 * storage stays in the tab, is never sent to the server, and clears on tab close.
 *
 * The value is consumed exactly once: {@link consumeAddressQuery} removes the key
 * as it reads it, so a refresh or back-navigation neither silently re-runs the
 * search nor leaves the address sitting in storage.
 */

const ADDRESS_HANDOFF_KEY = "lf:pending-address";

/**
 * Stash the guest's typed address for the studio to pick up on its next mount.
 *
 * Trims the input; empty/whitespace clears any previously stashed value instead
 * of writing a blank one. Never throws — if session storage is unavailable
 * (e.g. private mode, quota) the handoff is skipped and the studio falls back to
 * the demo parcel.
 *
 * @param address - The raw address text from the hero input.
 */
export function stashAddressQuery(address: string): void {
  if (typeof window === "undefined") return;
  const trimmed = address.trim();
  try {
    if (trimmed) {
      window.sessionStorage.setItem(ADDRESS_HANDOFF_KEY, trimmed);
    } else {
      window.sessionStorage.removeItem(ADDRESS_HANDOFF_KEY);
    }
  } catch {
    // Storage disabled or full — degrade silently; the studio shows the demo.
  }
}

/**
 * Read and remove the stashed address (consume-once).
 *
 * @returns The handed-off address, or null when nothing was stashed or session
 *   storage is unavailable.
 */
export function consumeAddressQuery(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(ADDRESS_HANDOFF_KEY);
    // Remove after reading so a refresh or back-navigation neither re-runs the
    // search nor leaves the address lingering in storage.
    window.sessionStorage.removeItem(ADDRESS_HANDOFF_KEY);
    return value;
  } catch {
    return null;
  }
}
