/**
 * Opaque, per-tab label tying the placement in a Studio URL to the lot that wrote it.
 *
 * The label is random, never derived from the address, so a URL (and anything that
 * records it: history, shared links, analytics) carries nothing that can be matched
 * back to a home. Which lot it stands for stays in this tab's session storage.
 * A label from another tab or device therefore never matches, and that placement
 * is recalculated for the lot that opens.
 */
import { certificateKey } from "./certificate-key";
import type { Parcel } from "./feasibility";

export const POSE_SCOPE_KEY = "lf:studio-pose-scope";

type LotMode = "preset" | "live" | "estimated";
type PoseScope = { token: string; lot: string };

// Same-page fallback for when sessionStorage throws (private/restricted browsing).
let memoryScope: PoseScope | null = null;
let storageFailed = false;

function lotIdentity(lot: Pick<Parcel, "address" | "city">, mode: LotMode): string {
  return `${mode}:${certificateKey(lot)}`;
}

function isPoseScope(value: unknown): value is PoseScope {
  return Boolean(value) && typeof value === "object"
    && /^[a-f0-9]{16}$/.test(String((value as PoseScope).token))
    && typeof (value as PoseScope).lot === "string";
}

function readScope(): PoseScope | null {
  if (storageFailed || typeof window === "undefined") return memoryScope;
  try {
    const raw = window.sessionStorage.getItem(POSE_SCOPE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isPoseScope(value) ? value : null;
  } catch {
    return memoryScope;
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The URL label for `lot`: stable while this tab stays on it, fresh once the lot changes. */
export function poseScopeForLot(lot: Pick<Parcel, "address" | "city">, mode: LotMode): string {
  const identity = lotIdentity(lot, mode);
  const current = readScope();
  if (current?.lot === identity) return current.token;
  const next = { token: randomToken(), lot: identity };
  memoryScope = next;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(POSE_SCOPE_KEY, JSON.stringify(next));
      storageFailed = false;
    } catch {
      storageFailed = true;
    }
  }
  return next.token;
}

/** Whether `token` was issued in this tab for `lot`. */
export function poseScopeMatchesLot(token: string, lot: Pick<Parcel, "address" | "city">, mode: LotMode): boolean {
  const current = readScope();
  return current?.token === token && current.lot === lotIdentity(lot, mode);
}
