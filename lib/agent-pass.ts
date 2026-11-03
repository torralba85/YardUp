/**
 * Agent passes: a real estate agent's code that lets prospective buyers claim
 * one complimentary certificate for that agent's listing.
 *
 * The code arrives as `?pass=CODE` on the agent's Studio link (or is typed in
 * on the Certificate step). Studio rewrites its URL while the visitor edits and
 * signing in can remount it, so the code lives in this tab's sessionStorage,
 * like the certificate purchase intent. It holds only the agent's public code,
 * never account or payment data. The server (`/api/certificates/redeem`)
 * decides whether a code is valid for the property.
 */

/** URL parameter that carries an agent pass code into the Studio. */
export const AGENT_PASS_PARAM = "pass";

/** How long a guest's "get this certificate" click stays resumable while they sign in. */
export const AGENT_PASS_REDEEM_TTL_MS = 30 * 60 * 1000;

const PASS_KEY = "lf:agent-pass";
const REDEEM_KEY = "lf:agent-pass-redeem";

/** Uppercase letters, digits and inner hyphens, 4 to 24 characters. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/;

/**
 * Normalize a typed or linked code: trims, uppercases and drops inner spaces.
 * Returns `null` for anything that cannot be a pass code, so malformed input
 * never reaches the server or a Firestore document id.
 */
export function normalizeAgentPassCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

// Same-page fallbacks when sessionStorage throws (private/restricted modes).
let inMemoryPass: string | null = null;
let inMemoryRedeem: { certKey: string; createdAt: number } | null = null;

/** Remember the agent's code for this tab. Invalid codes are ignored. */
export function rememberAgentPass(raw: unknown): string | null {
  const code = normalizeAgentPassCode(raw);
  if (!code || typeof window === "undefined") return code;
  inMemoryPass = code;
  try {
    window.sessionStorage.setItem(PASS_KEY, code);
  } catch {
    // The in-memory fallback above still covers this page.
  }
  return code;
}

/** The agent code remembered for this tab, if any. */
export function readAgentPass(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = normalizeAgentPassCode(window.sessionStorage.getItem(PASS_KEY));
    if (stored) return stored;
  } catch {
    // Fall through to the in-memory fallback.
  }
  return inMemoryPass;
}

/** Forget the remembered agent code for this tab. */
export function clearAgentPass(): void {
  inMemoryPass = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PASS_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

/** Record that a guest chose to claim the certificate for `certKey` before signing in. */
export function rememberAgentPassRedeemIntent(certKey: string, now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  const intent = { certKey, createdAt: now };
  inMemoryRedeem = intent;
  try {
    window.sessionStorage.setItem(REDEEM_KEY, JSON.stringify(intent));
  } catch {
    // The in-memory fallback above still covers an in-place sign-in.
  }
}

/**
 * Whether an unexpired claim click is pending — for `certKey` when given, or
 * for any certificate otherwise (used to reopen the Certificate step).
 */
export function hasAgentPassRedeemIntent(certKey?: string, now: number = Date.now()): boolean {
  const intent = readRedeemIntent();
  if (!intent || (certKey !== undefined && intent.certKey !== certKey)) return false;
  const age = now - intent.createdAt;
  return age >= 0 && age <= AGENT_PASS_REDEEM_TTL_MS;
}

/** Forget a pending claim click (consumed, dismissed, or not resumable). */
export function clearAgentPassRedeemIntent(): void {
  inMemoryRedeem = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(REDEEM_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function readRedeemIntent(): { certKey: string; createdAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REDEEM_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (
        value &&
        typeof value === "object" &&
        typeof (value as { certKey?: unknown }).certKey === "string" &&
        typeof (value as { createdAt?: unknown }).createdAt === "number"
      ) {
        return value as { certKey: string; createdAt: number };
      }
    }
  } catch {
    // Fall through to the in-memory fallback.
  }
  return inMemoryRedeem;
}

/** Error thrown by {@link redeemAgentPass}; its message is user-facing. */
export class AgentPassError extends Error {
  /** @param message - User-facing failure message. */
  constructor(message: string) {
    super(message);
    this.name = "AgentPassError";
  }
}

/** Input for {@link redeemAgentPass}. */
export interface RedeemAgentPassInput {
  /** The agent's pass code. */
  code: string;
  /** The stable per-lot certificate key of the property on screen. */
  certKey: string;
  /** The signed-in user's Firebase ID token, sent as a bearer credential. */
  idToken: string;
  /** Display name of the lot. */
  parcelName?: string;
  /** Street address of the property. */
  address?: string;
  /** City of the property. */
  city?: string;
  /** State of the property. */
  state?: string;
  /** Postal code of the property. */
  zip?: string;
  /** Latitude coordinate. */
  lat?: number;
  /** Longitude coordinate. */
  lng?: number;
  /** Full structured live parcel data when available. */
  parcelData?: Record<string, unknown>;
}

/**
 * Claim the complimentary certificate for the property on screen. Resolves
 * once the grant is written (or already existed); throws {@link AgentPassError}
 * with a user-facing message otherwise.
 */
export async function redeemAgentPass(input: RedeemAgentPassInput): Promise<void> {
  const { idToken, ...body } = input;
  let response: Response;
  try {
    response = await fetch("/api/certificates/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AgentPassError("Could not reach LotFoundry. Check your connection and try again.");
  }
  if (response.ok) return;
  const data: unknown = await response.json().catch(() => null);
  const message =
    data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
      ? (data as { error: string }).error
      : "Could not apply this code. Please try again.";
  throw new AgentPassError(message);
}
