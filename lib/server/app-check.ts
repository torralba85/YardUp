import { getAppCheck } from "firebase-admin/app-check";
import type { NextRequest } from "next/server";
import { getAdminApp } from "@/lib/server/firebase-admin";

/** Header the Firebase JS SDK convention uses for App Check tokens. */
export const APP_CHECK_HEADER = "x-firebase-appcheck";

export type AppCheckVerdict = "valid" | "missing" | "invalid" | "unavailable";

// Thrown by the local JWT checks: malformed, wrong project, bad signature, or expired.
const REJECTED_TOKEN_CODES = new Set(["app-check/invalid-argument", "app-check/app-check-token-expired"]);

function errorCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

/**
 * Verify a limited-use App Check token, then consume it so it cannot be replayed.
 *
 * The signature check runs locally against App Check's public keys. Consuming
 * calls the App Check API as the runtime service account, which needs
 * `roles/firebaseappcheck.tokenVerifier`. If that call fails, the token is still
 * genuine, so it is accepted and the missing replay protection is logged.
 */
export async function verifyLimitedUseAppCheck(request: NextRequest): Promise<AppCheckVerdict> {
  const token = request.headers.get(APP_CHECK_HEADER)?.trim();
  if (!token) return "missing";
  const appCheck = getAppCheck(getAdminApp());
  try {
    await appCheck.verifyToken(token);
  } catch (error) {
    const code = errorCode(error);
    if (REJECTED_TOKEN_CODES.has(code)) return "invalid";
    console.error("[app-check] verification unavailable:", code || (error instanceof Error ? error.message : "unknown"));
    return "unavailable";
  }
  try {
    const { alreadyConsumed } = await appCheck.verifyToken(token, { consume: true });
    return alreadyConsumed ? "invalid" : "valid";
  } catch (error) {
    console.warn("[app-check] replay protection unavailable; accepted a verified token:", errorCode(error) || "unknown");
    return "valid";
  }
}
