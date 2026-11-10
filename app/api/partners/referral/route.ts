import { type NextRequest, NextResponse } from "next/server";
import {
  isGreatBuildzReferralEnabled,
  validatePartnerReferralRequest,
} from "@/lib/partner-referrals";
import { requireApiAuth } from "@/lib/server/api-auth";
import { createPartnerReferral } from "@/lib/server/partner-referrals";
import { checkRateLimit } from "@/lib/server/rate-limit";

/** Run on the Node.js runtime: the Admin SDK is not Edge-compatible. */
export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store" };

/**
 * POST /api/partners/referral
 *
 * Homeowner-directed referral to a partner network (GreatBuildz). Signed-in
 * only, off unless `NEXT_PUBLIC_GREATBUILDZ_REFERRAL=true`, limited per
 * account. The body is rebuilt from known fields before it is stored in the
 * server-only `partnerReferrals` ledger and emailed to the partner.
 */
export async function POST(request: NextRequest) {
  if (!isGreatBuildzReferralEnabled()) {
    return NextResponse.json({ error: "Partner referrals are not available." }, { status: 404, headers });
  }

  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  const limited = checkRateLimit(request, {
    namespace: "partner-referral",
    clientKey: auth.uid,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const validation = validatePartnerReferralRequest(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400, headers });
  }

  try {
    const referral = await createPartnerReferral(auth.uid, validation.value);
    return NextResponse.json(referral, { headers });
  } catch (err) {
    console.error("[partners/referral] failed for uid", auth.uid, err);
    return NextResponse.json(
      { error: "Could not send this referral. Please try again." },
      { status: 500, headers },
    );
  }
}
