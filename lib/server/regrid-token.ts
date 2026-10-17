/**
 * Regrid API tokens are HS256 JWTs with an `exp` claim, and Regrid answers an
 * expired or revoked one with `401 Invalid token`. That failure is silent to
 * users (the parcel route falls back to free county GIS), so this reads only
 * the time claims, never the signature or identity claims, to say why Regrid is
 * failing and to warn before a token lapses. Server-only.
 *
 * The production token expired on 2026-06-29, two weeks before the secret was
 * created, and nothing noticed for three months.
 */
const WARN_DAYS = 14;
const DAY_MS = 86_400_000;

export interface RegridTokenStatus {
  format: "missing" | "jwt" | "opaque";
  /** ISO time the token expires, when it is a JWT with an `exp` claim. */
  expiresAt?: string;
  /** Whole days left; negative once expired. */
  daysLeft?: number;
  expired?: boolean;
}

/** Non-secret expiry facts about a Regrid token. Never returns the token. */
export function regridTokenStatus(
  token: string | undefined,
  now = Date.now(),
): RegridTokenStatus {
  const value = token?.trim();
  if (!value) return { format: "missing" };
  const parts = value.split(".");
  if (parts.length !== 3) return { format: "opaque" };
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return { format: "jwt" };
    }
    const expiresMs = payload.exp * 1000;
    return {
      format: "jwt",
      expiresAt: new Date(expiresMs).toISOString(),
      daysLeft: Math.floor((expiresMs - now) / DAY_MS),
      expired: expiresMs <= now,
    };
  } catch {
    return { format: "opaque" };
  }
}

/**
 * One structured ERROR line when Regrid rejects the credential (401 or 403).
 * Carries the token's expiry facts so the cause is readable in the log, and
 * nothing that could reveal the token.
 */
export function logRegridAuthFailure(
  status: number,
  token: string | undefined,
): void {
  console.error(
    JSON.stringify({
      severity: "ERROR",
      event: "regrid_auth_failed",
      status,
      token: regridTokenStatus(token),
    }),
  );
}

let expiryWarned = false;

/**
 * Log once per server instance when the token is already expired or expires
 * within two weeks. A token that is not a JWT with an `exp` cannot be judged
 * and is left alone.
 */
export function warnIfRegridTokenExpiring(
  token: string | undefined,
  now = Date.now(),
): void {
  if (expiryWarned) return;
  const status = regridTokenStatus(token, now);
  if (status.expired === undefined) return;
  if (!status.expired && (status.daysLeft ?? Infinity) > WARN_DAYS) return;
  expiryWarned = true;
  const line = JSON.stringify({
    severity: status.expired ? "ERROR" : "WARNING",
    event: "regrid_token_expiring",
    ...status,
  });
  if (status.expired) console.error(line);
  else console.warn(line);
}

/** Forget that the expiry warning was logged. For tests. */
export function resetRegridTokenWarning(): void {
  expiryWarned = false;
}
