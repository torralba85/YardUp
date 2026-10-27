import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import { COLOR } from "@/lib/design-tokens";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
  PARTNER_NETWORKS,
  partnerConsentText,
  type PartnerNetwork,
  type PartnerReferralHandoff,
  type PartnerReferralRequest,
  type PartnerReferralStatus,
} from "@/lib/partner-referrals";

/** Server-only ledger. Firestore rules deny every client read and write. */
export const PARTNER_REFERRALS = "partnerReferrals";

/** A slow provider must not hold the request open; the referral stays queued. */
export const PARTNER_EMAIL_TIMEOUT_MS = 8_000;

/** "LFR-XXXXXXXX": the reference both sides quote when reconciling referrals. */
export function generateReferralId(): string {
  return `LFR-${randomBytes(5).toString("hex").toUpperCase().slice(0, 8)}`;
}

/**
 * Deterministic ledger doc id per homeowner, partner and property, so a double
 * submit or a retry does not send the same homeowner to the partner twice.
 */
export function partnerReferralDocId(uid: string, partnerId: string, address: string): string {
  const normalized = address.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(`${uid}|${partnerId}|${normalized}`).digest("hex").slice(0, 32);
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/** The intake email LotFoundry sends the partner for one referral. */
export function renderPartnerReferralEmail(
  partner: PartnerNetwork,
  referralId: string,
  handoff: PartnerReferralHandoff,
) {
  const { homeowner, property, project } = handoff;
  const lines: Array<[string, string]> = [
    ["LotFoundry referral", referralId],
    ["Homeowner", homeowner.name],
    ["Email", homeowner.email],
    ["Phone", homeowner.phone ?? "Not given"],
    ["Property", `${property.address}`],
    ["County", `${property.county}, ${property.state}`],
    ["Lot size", `${property.lotSqft.toLocaleString("en-US")} sq ft`],
    ["Backyard home", `${project.aduSqft.toLocaleString("en-US")} sq ft, ${project.widthFt} x ${project.lengthFt} ft, ${project.roof} roof, ${project.finish} finish`],
    ["Estimated build band", `${money(project.buildBandLow)} to ${money(project.buildBandHigh)}`],
    ["Zoning screen", project.zoningStatus],
    ["Message", homeowner.message ?? "None"],
  ];
  const note = `The homeowner asked LotFoundry to share this project with ${partner.name} and agreed to be contacted. Figures are LotFoundry planning estimates, not quotes, surveys or permit approvals. Please quote ${referralId} in referral reports.`;
  const subject = `LotFoundry referral ${referralId}: ${property.city || property.county}, ${property.state}`;
  const text = `${lines.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${note}\n\nLotFoundry - support@lotfoundry.net`;
  const rows = lines
    .map(([label, value]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`)
    .join("");
  const html = `<html><body style="background:${COLOR["lot-chalk"]};color:${COLOR["lot-ink"]};font-family:Arial,sans-serif;padding:24px"><h1>LotFoundry referral ${escapeHtml(referralId)}</h1><table>${rows}</table><p>${escapeHtml(note)}</p><p>LotFoundry - support@lotfoundry.net</p></body></html>`;
  return { subject, text, html };
}

export interface PartnerHandoffResult {
  delivery: "sent" | "queued";
  resendId?: string;
  error?: string;
}

/**
 * Email the referral to the partner's intake inbox. Never throws: with no
 * Resend key or no intake address configured, or on a provider error, the
 * referral stays `queued` in the ledger for ops to hand off manually.
 */
export async function dispatchPartnerReferral(
  partner: PartnerNetwork,
  referralId: string,
  handoff: PartnerReferralHandoff,
): Promise<PartnerHandoffResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const intake = process.env.GREATBUILDZ_REFERRAL_EMAIL?.trim();
  if (!apiKey || !intake) return { delivery: "queued" };

  const message = renderPartnerReferralEmail(partner, referralId, handoff);
  try {
    const { data, error } = await new Resend(apiKey).emails.send(
      {
        from: "LotFoundry Referrals <support@lotfoundry.net>",
        to: [intake],
        // The partner's reply goes to the homeowner they are introducing.
        replyTo: handoff.homeowner.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: { "X-Entity-Ref-ID": referralId },
      },
      { idempotencyKey: `partner-referral/${referralId}`, signal: AbortSignal.timeout(PARTNER_EMAIL_TIMEOUT_MS) },
    );
    if (error) {
      console.error("[partner-referral] Resend error:", error);
      return { delivery: "queued", error: error.message };
    }
    return data?.id ? { delivery: "sent", resendId: data.id } : { delivery: "queued" };
  } catch (err) {
    console.error("[partner-referral] Unexpected error:", err);
    return { delivery: "queued", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export interface CreatePartnerReferralResult {
  referralId: string;
  status: PartnerReferralStatus;
  duplicate: boolean;
}

/**
 * Record the referral, hand it to the partner, then record the delivery
 * outcome. The ledger row is created before anything leaves LotFoundry, so
 * every handoff is traceable even if the email step fails midway.
 */
export async function createPartnerReferral(
  uid: string,
  request: PartnerReferralRequest,
): Promise<CreatePartnerReferralResult> {
  const partner = PARTNER_NETWORKS[request.partnerId];
  const db = getAdminDb();
  const ref = db
    .collection(PARTNER_REFERRALS)
    .doc(partnerReferralDocId(uid, partner.id, request.handoff.property.address));

  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() ?? {};
    return {
      referralId: String(data.referralId ?? ""),
      status: (data.status as PartnerReferralStatus) ?? "queued",
      duplicate: true,
    };
  }

  const referralId = generateReferralId();
  await ref.create({
    referralId,
    partnerId: partner.id,
    ownerUid: uid,
    status: "queued" satisfies PartnerReferralStatus,
    handoff: request.handoff,
    consent: {
      version: request.consentVersion,
      text: partnerConsentText(partner),
      acceptedAt: FieldValue.serverTimestamp(),
    },
    // Non-PII fields kept after account deletion for referral-fee reconciliation.
    attribution: {
      source: "studio-connect-builders",
      state: request.handoff.property.state,
      county: request.handoff.property.county,
      aduSqft: request.handoff.project.aduSqft,
    },
    history: [{ status: "queued", at: new Date().toISOString() }],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const delivery = await dispatchPartnerReferral(partner, referralId, request.handoff);
  const status: PartnerReferralStatus = delivery.delivery === "sent" ? "sent" : "queued";
  await ref.update({
    status,
    delivery: {
      channel: "email",
      outcome: delivery.delivery,
      ...(delivery.resendId ? { resendId: delivery.resendId } : {}),
      ...(delivery.error ? { error: delivery.error.slice(0, 300) } : {}),
      attemptedAt: FieldValue.serverTimestamp(),
    },
    ...(status === "sent"
      ? { history: FieldValue.arrayUnion({ status: "sent", at: new Date().toISOString() }) }
      : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { referralId, status, duplicate: false };
}
