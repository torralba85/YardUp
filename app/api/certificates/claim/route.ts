import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import {
  ClaimConfigurationError,
  claimCertificatesByVerifiedEmail,
} from "@/lib/server/certificate-purchases";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const MAX_CERT_KEY_LEN = 200;

/**
 * POST /api/certificates/claim  { certKey? }
 *
 * Claims paid Stripe certificate grants whose stored `buyerEmail` (and live
 * Stripe Checkout session email) matches the authenticated caller's verified
 * Firebase email address. Anonymous callers and unverified emails are rejected.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!auth.emailVerified || typeof auth.email !== "string" || !auth.email.trim()) {
    return NextResponse.json(
      { error: "Verify your email address before claiming a certificate purchase." },
      { status: 403 },
    );
  }

  const limited = checkRateLimit(request, {
    limit: 10,
    namespace: "certificate-claim",
    windowMs: 60_000,
    clientKey: auth.uid,
  });
  if (limited) return limited;

  let certKey: string | undefined;
  const rawBody = await request.text().catch(() => "");
  if (rawBody.trim().length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const rawCertKey = (parsed as { certKey?: unknown }).certKey;
    if (rawCertKey !== undefined) {
      if (
        typeof rawCertKey !== "string" ||
        !rawCertKey.trim() ||
        rawCertKey.trim().length > MAX_CERT_KEY_LEN
      ) {
        return NextResponse.json({ error: "A valid certKey is required." }, { status: 400 });
      }
      certKey = rawCertKey.trim();
    }
  }

  try {
    const result = await claimCertificatesByVerifiedEmail({
      targetUid: auth.uid,
      verifiedEmail: auth.email,
      certKey,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ClaimConfigurationError) {
      return NextResponse.json({ error: "Payments are not available." }, { status: 503 });
    }
    console.error(
      "[certificates/claim] Failed to claim certificates:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Could not check for guest purchases right now. Please try again." },
      { status: 503 },
    );
  }
}
