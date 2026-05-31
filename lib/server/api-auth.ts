import { NextResponse, type NextRequest } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

interface AuthResult {
  uid: string;
}

function getAdminAuth() {
  if (getApps().length === 0) {
    initializeApp();
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
