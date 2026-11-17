import { NextResponse, type NextRequest } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

interface AuthResult {
  uid: string;
  /** The account email from the verified ID token, never from the request body. */
  email?: string;
  /** Whether Firebase has verified that the account owns {@link email}. */
  emailVerified?: boolean;
  /** True only when explicitly opted-in via `allowAnonymous` and the token is anonymous. */
  isAnonymous?: boolean;
}

export interface RequireApiAuthOptions {
  /**
   * Allow Firebase anonymous sessions (used only for guest web certificate
   * checkout and paid-certificate project briefs). Defaults to `false`.
   */
  allowAnonymous?: boolean;
}

function getAdminAuth() {
  if (getApps().length === 0) {
    // Verifying an ID token only needs the public project ID. The Admin SDK
    // fetches Google's public signing certs and checks the JWT's signature +
    // audience against it. No service-account secret is required for
    // verification. Passing projectId explicitly lets token checks work in any
    // environment (local dev, CI) where Application Default Credentials don't
    // auto-resolve a project; on Firebase/Google infra ADC still supplies
    // credentials for everything else.
    initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "yardup-2026",
    });
  }
  return getAuth();
}

/**
 * Require a valid Firebase ID token on an API request.
 *
 * In test mode or when `LOTFOUNDRY_ALLOW_PUBLIC_API` is set, returns a stub
 * `local-dev` uid without verification. Otherwise it reads the `Bearer` token
 * from the `Authorization` header and verifies it with the Firebase Admin SDK.
 *
 * @param request - The incoming Next.js request.
 * @returns `{ uid, email?, emailVerified? }` on success (email fields only when
 *   the token carries an email), or a 401 {@link NextResponse} the route should
 *   return as-is when authentication is missing or invalid.
 */
export async function requireApiAuth(
  request: NextRequest,
  options?: RequireApiAuthOptions,
): Promise<AuthResult | NextResponse> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.LOTFOUNDRY_ALLOW_PUBLIC_API === "true"
  ) {
    return { uid: "local-dev" };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    const isAnonymous = decoded.firebase?.sign_in_provider === "anonymous";
    if (isAnonymous) {
      if (!options?.allowAnonymous) {
        return NextResponse.json(
          { error: "Account sign-in required" },
          { status: 403 },
        );
      }
      return { uid: decoded.uid, isAnonymous: true };
    }
    if (typeof decoded.email !== "string" || !decoded.email) {
      return { uid: decoded.uid };
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
    };
  } catch (err) {
    console.warn("[api-auth] Firebase ID token verification failed:", err);
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 },
    );
  }
}
