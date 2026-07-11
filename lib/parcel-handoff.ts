import type { LiveParcelData } from "./parcel-types";

const INITIAL_PARCEL_KEY = "lf:initial-live-parcel";

/**
 * Stash a resolved live parcel for the studio's next mount.
 *
 * This is intentionally session-only and one-shot: signed-in users should enter
 * the studio with real property data, without persisting an address in the URL
 * or briefly rendering a demo preset while the lookup completes.
 *
 * @returns Whether the parcel was stored successfully.
 */
export function stashInitialParcel(parcel: LiveParcelData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(INITIAL_PARCEL_KEY, JSON.stringify(parcel));
    return true;
  } catch {
    // Storage can be unavailable in private browsing; the caller keeps the gate
    // open and can surface a retry instead of falling through to demo data.
    return false;
  }
}

/** Read the pending parcel without removing it so React Strict Mode is safe. */
export function peekInitialParcel(): LiveParcelData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(INITIAL_PARCEL_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isLiveParcelData(value) ? value : null;
  } catch {
    return null;
  }
}

/** Clear the one-shot parcel after the provider has initialized from it. */
export function clearInitialParcel(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(INITIAL_PARCEL_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function isLiveParcelData(value: unknown): value is LiveParcelData {
  if (!value || typeof value !== "object") return false;
  const parcel = value as Partial<LiveParcelData>;
  return (
    typeof parcel.address === "string" &&
    typeof parcel.city === "string" &&
    typeof parcel.lat === "number" &&
    typeof parcel.lng === "number" &&
    typeof parcel.lotArea === "number" &&
    typeof parcel.lotWidth === "number" &&
    typeof parcel.lotLength === "number" &&
    typeof parcel.existingHouseSqft === "number" &&
    typeof parcel.maxLotCoveragePercent === "number" &&
    typeof parcel.zoning === "string" &&
    (parcel.source === "regrid" || parcel.source === "fallback") &&
    !!parcel.setbacks &&
    typeof parcel.setbacks.front === "number" &&
    typeof parcel.setbacks.rear === "number" &&
    typeof parcel.setbacks.side === "number"
  );
}
