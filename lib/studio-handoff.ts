/**
 * Single owner of the client-only Studio handoff: the address a visitor typed
 * (pending address) and the parcel already resolved for them (resolved parcel).
 *
 * Both travel through session storage, never the URL, so a guest's address does
 * not leak into history, `Referer`, or analytics. Legacy storage keys are kept so
 * a tab opened before a deploy still hands off correctly, and the independent
 * `stash*`/`peek*`/`consume*`/`clear*` primitives keep their old behavior.
 *
 * Precedence: a pending address is looked up afresh and wins over a resolved
 * parcel; a resolved parcel wins over any `?q=` fallback and over demo presets.
 * Producers that hold an already-resolved parcel use {@link publishResolvedParcel},
 * which supersedes any stale address. The address is consumed once; the parcel is
 * peeked, then cleared by its owner once initialised (React Strict Mode safe).
 *
 * When storage writes fail, the in-memory copy is authoritative for this page
 * load so a stale value left in storage can never resurface.
 */
import type { LiveParcelData } from "./parcel-types";

export const PENDING_ADDRESS_KEY = "lf:pending-address";
export const RESOLVED_PARCEL_KEY = "lf:initial-live-parcel";

// Same-page fallbacks for when sessionStorage throws (private/restricted
// browsing): the gate and the provider it hands off to mount in one page load.
let inMemoryParcel: LiveParcelData | null = null;
let parcelStorageFailed = false;
// undefined = no override; otherwise authoritative after a failed storage write.
let memoryAddress: string | null | undefined;

/** Stash the typed address (trimmed); blank input clears. Never throws. */
export function stashAddressQuery(address: string): void {
  if (typeof window === "undefined") return;
  const trimmed = address.trim();
  try {
    if (trimmed) window.sessionStorage.setItem(PENDING_ADDRESS_KEY, trimmed);
    else window.sessionStorage.removeItem(PENDING_ADDRESS_KEY);
    memoryAddress = undefined;
  } catch {
    // Storage unavailable: keep this page load consistent and never resurrect
    // whatever stale value storage may still hold.
    memoryAddress = trimmed || null;
    try {
      window.sessionStorage.removeItem(PENDING_ADDRESS_KEY);
    } catch {
      // Best-effort only.
    }
  }
}

/** Read the pending address without removing it. */
export function peekAddressQuery(): string | null {
  if (typeof window === "undefined") return null;
  if (memoryAddress !== undefined) return memoryAddress;
  try {
    return window.sessionStorage.getItem(PENDING_ADDRESS_KEY);
  } catch {
    return null;
  }
}

/** Read and remove the pending address (consume-once). */
export function consumeAddressQuery(): string | null {
  if (typeof window === "undefined") return null;
  const value = peekAddressQuery();
  memoryAddress = undefined;
  try {
    window.sessionStorage.removeItem(PENDING_ADDRESS_KEY);
  } catch {
    // Removal failed: mark consumed in memory so stored text cannot replay.
    memoryAddress = null;
  }
  return value;
}

/**
 * Stash a resolved live parcel for the studio's next mount (session-only).
 *
 * @returns Whether the parcel was stored (in memory at minimum).
 */
export function stashInitialParcel(parcel: LiveParcelData): boolean {
  if (typeof window === "undefined") return false;
  inMemoryParcel = parcel;
  try {
    window.sessionStorage.setItem(RESOLVED_PARCEL_KEY, JSON.stringify(parcel));
    parcelStorageFailed = false;
  } catch {
    // The in-memory copy now wins so a stale stored parcel cannot resurface.
    parcelStorageFailed = true;
    try {
      window.sessionStorage.removeItem(RESOLVED_PARCEL_KEY);
    } catch {
      // Best-effort only.
    }
  }
  return true;
}

/** Read the resolved parcel without removing it so React Strict Mode is safe. */
export function peekInitialParcel(): LiveParcelData | null {
  if (typeof window === "undefined") return inMemoryParcel;
  if (parcelStorageFailed) return inMemoryParcel;
  try {
    const raw = window.sessionStorage.getItem(RESOLVED_PARCEL_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (isLiveParcelData(value)) return value;
    }
  } catch {
    // Fall through to the in-memory fallback.
  }
  return inMemoryParcel;
}

/** Clear the one-shot parcel after its owner has initialised from it. */
export function clearInitialParcel(): void {
  inMemoryParcel = null;
  parcelStorageFailed = false;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RESOLVED_PARCEL_KEY);
  } catch {
    // Keep the consumed value from reappearing if storage is blocked.
    parcelStorageFailed = true;
  }
}

/**
 * Producer entry point for an already-resolved parcel: an explicit new
 * selection supersedes any stale pending address, so the Studio consumes this
 * parcel without re-fetching it.
 *
 * @returns Whether the parcel was stored (in memory at minimum).
 */
export function publishResolvedParcel(parcel: LiveParcelData): boolean {
  stashAddressQuery("");
  return stashInitialParcel(parcel);
}

/** True when any handoff input is pending (suppresses demo/wizard entry). */
export function hasPendingStudioHandoff(): boolean {
  return Boolean(peekAddressQuery()) || peekInitialParcel() !== null;
}

/** What the signed-in gate should do on mount, with precedence applied. */
export type StudioEntry =
  | { kind: "address"; address: string }
  | { kind: "parcel" }
  | { kind: "none" };

/**
 * Consumer entry point for the signed-in gate: a pending address (consumed
 * once) wins and must be looked up; otherwise a resolved parcel opens the
 * Studio directly (left in place for the provider to clear).
 */
export function takeStudioEntry(): StudioEntry {
  const address = consumeAddressQuery();
  if (address) return { kind: "address", address };
  return peekInitialParcel() !== null ? { kind: "parcel" } : { kind: "none" };
}

/**
 * Resolve the address to search on Studio mount: the pending address (consumed
 * once) else the `?q=` fallback. Callers memoise the result per component
 * instance so a Strict Mode re-run replays it instead of finding storage empty.
 */
export function takeIncomingAddress(search: string | URLSearchParams): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return consumeAddressQuery() ?? params.get("q")?.trim() ?? null;
}

/** True for parcels resolved from a live provider (or its fallback). */
export function isLiveParcelSource(parcel: unknown): boolean {
  if (!parcel || typeof parcel !== "object" || !("source" in parcel)) return false;
  const source = (parcel as { source?: unknown }).source;
  return source === "regrid" || source === "county-gis" || source === "fallback";
}

/**
 * Stage the handoff a Certificate account link needs across the sign-in redirect.
 * Live parcels are published as the resolved parcel; estimated parcels hand off a
 * full address instead; demo presets restore from the scenario URL.
 *
 * @returns A rollback that restores whatever was pending before staging, but only
 *   for values that are still the staged ones, so a newer selection survives.
 *   Idempotent.
 */
export function stageCertificateLinkHandoff(input: {
  parcel: unknown;
  parcelName: string;
}): () => void {
  const { parcel, parcelName } = input;
  const prevParcel = peekInitialParcel();
  const prevAddress = peekAddressQuery();
  let stagedParcel: LiveParcelData | null = null;
  let stagedAddress: string | null = null;

  if (isLiveParcelSource(parcel)) {
    stagedParcel = parcel as LiveParcelData;
    publishResolvedParcel(stagedParcel);
  } else if (
    parcel &&
    typeof parcel === "object" &&
    "source" in parcel &&
    (parcel as { source?: unknown }).source === "estimated"
  ) {
    const p = parcel as { address?: unknown; city?: unknown };
    const query =
      parcelName.trim() ||
      [p.address, p.city]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(", ");
    if (query) {
      stashAddressQuery(query);
      stagedAddress = query.trim();
    }
  }

  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (stagedParcel && sameParcel(peekInitialParcel(), stagedParcel)) {
      if (prevParcel) stashInitialParcel(prevParcel);
      else clearInitialParcel();
      // Publishing cleared the address; restore it unless something newer set one.
      if (prevAddress && !peekAddressQuery()) stashAddressQuery(prevAddress);
    }
    if (stagedAddress !== null && peekAddressQuery() === stagedAddress) {
      if (prevAddress) stashAddressQuery(prevAddress);
      else consumeAddressQuery();
    }
  };
}

function sameParcel(a: LiveParcelData | null, b: LiveParcelData): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
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
    (parcel.source === "regrid" ||
      parcel.source === "county-gis" ||
      parcel.source === "fallback") &&
    !!parcel.setbacks &&
    typeof parcel.setbacks.front === "number" &&
    typeof parcel.setbacks.rear === "number" &&
    typeof parcel.setbacks.side === "number"
  );
}

/**
 * Point the current URL's `step` at the certificate, or drop it, without a
 * navigation, so a sign-in remount reopens this step.
 *
 * @returns Whether the URL changed.
 */
function setCertificateStepParam(on: boolean): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if ((params.get("step") === "certificate") === on) return false;
  if (on) params.set("step", "certificate");
  else params.delete("step");
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );
  return true;
}

/** Stage the selected Lot and reopen the Certificate after account linking. */
export function stageCertificateAccountLink(input: Parameters<typeof stageCertificateLinkHandoff>[0]): () => void {
  const rollbackParcel = stageCertificateLinkHandoff(input);
  const addedStep = setCertificateStepParam(true);
  return () => {
    rollbackParcel();
    if (addedStep) setCertificateStepParam(false);
  };
}
