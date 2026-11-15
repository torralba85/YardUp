import { auth } from "./firebase";
import {
  PARTNER_REFERRAL_CONSENT_VERSION,
  type PartnerNetworkId,
  type PartnerReferralHandoff,
  type PartnerReferralStatus,
} from "./partner-referrals";

export interface PartnerReferralResponse {
  referralId: string;
  status: PartnerReferralStatus;
  duplicate: boolean;
}

/**
 * Send a homeowner-directed referral to a partner network through
 * `POST /api/partners/referral`. Throws with a user-facing message on failure.
 */
export async function submitPartnerReferral(input: {
  partnerId: PartnerNetworkId;
  handoff: PartnerReferralHandoff;
}): Promise<PartnerReferralResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before connecting with builders.");

  const response = await fetch("/api/partners/referral", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({
      partnerId: input.partnerId,
      consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
      handoff: input.handoff,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<PartnerReferralResponse> & { error?: string })
    | null;
  if (!response.ok || !payload?.referralId) {
    throw new Error(payload?.error || "Could not send this referral. Please try again.");
  }
  return {
    referralId: payload.referralId,
    status: payload.status ?? "queued",
    duplicate: Boolean(payload.duplicate),
  };
}
