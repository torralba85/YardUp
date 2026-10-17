import { getAppCheck } from "firebase-admin/app-check";
import type { NextRequest } from "next/server";
import { getAdminApp } from "@/lib/server/firebase-admin";

/** Header the Firebase JS SDK convention uses for App Check tokens. */
export const APP_CHECK_HEADER = "x-firebase-appcheck";

export type AppCheckVerdict = "valid" | "missing" | "invalid" | "unavailable";

// Thrown by the local JWT checks: malformed, wrong project, bad signature, or expired.
const REJECTED_TOKEN_CODES = new Set(["app-check/invalid-argument", "app-check/app-check-token-expired"]);

/**
 * Verify a limited-use App Check token and consume it, so each token proves one
 * real browser request and cannot be replayed by a script.
 */
export async function verifyLimitedUseAppCheck(request: NextRequest): Promise<AppCheckVerdict> {
  const token = request.headers.get(APP_CHECK_HEADER)?.trim();
  if (!token) return "missing";
  try {
    const result = await getAppCheck(getAdminApp()).verifyToken(token, { consume: true });
    return result.alreadyConsumed ? "invalid" : "valid";
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (REJECTED_TOKEN_CODES.has(code)) return "invalid";
    console.error("[app-check] verification unavailable:", code || (error instanceof Error ? error.message : "unknown"));
    return "unavailable";
  }
}
