import { NextResponse, type NextRequest } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

interface AuthResult {
  uid: string;
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

export async function requireApiAuth(
  request: NextRequest,
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
    return { uid: decoded.uid };
  } catch (err) {
    console.warn("[api-auth] Firebase ID token verification failed:", err);
    return NextResponse.json(
      { error: "Invalid authentication token" },
      { status: 401 },
    );
  }
}
