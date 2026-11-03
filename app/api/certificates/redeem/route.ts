import { type NextRequest, NextResponse } from "next/server";
import { normalizeAgentPassCode } from "@/lib/agent-pass";
import { redeemAgentPassGrant, type AgentPassRedeemResult } from "@/lib/server/agent-passes";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Same bound as the certificate checkout route. */
const MAX_CERT_KEY_LEN = 200;

const FAILURES: Record<Exclude<AgentPassRedeemResult["kind"], "granted" | "already_granted">, { status: number; error: string }> = {
  not_found: { status: 404, error: "This code doesn't apply to this property." },
  wrong_property: { status: 404, error: "This code doesn't apply to this property." },
  expired: { status: 410, error: "This code has expired." },
  used_up: { status: 410, error: "This code has been fully used." },
};

function optionalString(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

/**
 * POST /api/certificates/redeem  { code, certKey, parcelName?, address?, ... }
 *
 * Claims a complimentary certificate for the signed-in user with a real
 * estate agent's pass code. The grant is a `$0` `certificatePurchases` record
 * stamped `source: "agent_pass"`; it never touches Stripe or fires a purchase
 * conversion. Rate limited per client so codes cannot be guessed in bulk.
 */
export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, {
    namespace: "certificate-pass-redeem",
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const code = normalizeAgentPassCode(body?.code);
  const certKey = typeof body?.certKey === "string" ? body.certKey.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Enter the code exactly as your agent shared it." }, { status: 400 });
  }
  if (!certKey || certKey.length > MAX_CERT_KEY_LEN) {
    return NextResponse.json({ error: "A valid certKey is required" }, { status: 400 });
  }

  let result: AgentPassRedeemResult;
  try {
    result = await redeemAgentPassGrant({
      code,
      uid: auth.uid,
      certKey,
      parcelName: optionalString(body?.parcelName, 200),
      address: optionalString(body?.address, 200),
      city: optionalString(body?.city, 100),
      state: optionalString(body?.state, 50),
      zip: optionalString(body?.zip, 20),
      lat: typeof body?.lat === "number" ? body.lat : undefined,
      lng: typeof body?.lng === "number" ? body.lng : undefined,
      parcelData:
        body?.parcelData && typeof body.parcelData === "object" && !Array.isArray(body.parcelData)
          ? (body.parcelData as Record<string, unknown>)
          : undefined,
    });
  } catch (err) {
    console.error("[certificates/redeem] Redemption failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not apply this code right now. Please try again shortly." },
      { status: 503 },
    );
  }

  if (result.kind === "granted" || result.kind === "already_granted") {
    return NextResponse.json({ status: "granted", alreadyGranted: result.kind === "already_granted" });
  }
  const failure = FAILURES[result.kind];
  return NextResponse.json({ error: failure.error }, { status: failure.status });
}
