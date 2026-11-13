import { createHash, randomBytes } from "node:crypto";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { Resend } from "resend";
import { COLOR } from "@/lib/design-tokens";
import { finishLabels, roofLabels, type ExteriorFinish, type RoofStyle } from "@/lib/feasibility";
import { fireZoneLabel } from "@/lib/fire-hazard";
import type { FireHazardZone } from "@/lib/parcel-types";
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

const BEDROOM_LABELS: Record<string, string> = { studio: "Studio", "1br": "1 bedroom", "2br": "2 bedrooms" };

function fireHazardText(value: string): string {
  if (value === "none") return "Not in a mapped zone";
  if (value === "unknown") return "Not confirmed";
  return fireZoneLabel(value as FireHazardZone) ?? value;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * The introduction email for one referral. It goes to the partner's team with
 * the homeowner copied, so it is written to be read by both.
 */
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
    ["Phone", homeowner.phone || "Not given"],
    ["Property", property.address],
    ["County", `${property.county}, ${property.state}`],
    ["Lot size", `${property.lotSqft.toLocaleString("en-US")} sq ft`],
    ["Existing building footprint", property.existingFootprintSqft === null ? "Not confirmed" : `${property.existingFootprintSqft.toLocaleString("en-US")} sq ft`],
    ["Reported zoning", property.zoning ?? "Not found"],
    ["Fire hazard zone", fireHazardText(property.fireHazard)],
    ["Backyard home", `${project.aduSqft.toLocaleString("en-US")} sq ft, ${project.widthFt} x ${project.lengthFt} ft, ${(roofLabels[project.roof as RoofStyle] ?? project.roof).toLowerCase()} roof, ${(finishLabels[project.finish as ExteriorFinish] ?? project.finish).toLowerCase()} finish`],
    ["Bedrooms (modeled)", BEDROOM_LABELS[project.bedroomClass] ?? project.bedroomClass],
    ["Estimated build cost", `${money(project.buildBandLow)} to ${money(project.buildBandHigh)}`],
    ["Zoning screen", project.zoningStatus],
    ["Message", homeowner.message || "None"],
  ];
  const place = property.city || `${property.county} County`;
  const intro = `I'd like to introduce ${homeowner.name}, who is planning a backyard home at their property in ${place} and asked LotFoundry to connect them with ${partner.name}.`;
  const handover = `${firstName(homeowner.name)}, ${partner.name} is copied here. A ${partner.name} project advisor will reach out to set up your free consultation.`;
  const note = `These are LotFoundry planning estimates, not quotes, surveys or permit approvals. Please reply all on first contact and quote ${referralId} in referral reports.`;
  const subject = `Introducing you to ${partner.name} Contractor Matching Service (${referralId})`;
  const signoff = "LotFoundry\nsupport@lotfoundry.net";
  const text = [
    partner.introSalutation,
    intro,
    handover,
    lines.map(([label, value]) => `${label}: ${value}`).join("\n"),
    note,
    signoff,
  ].join("\n\n");
  const rows = lines
    .map(([label, value]) => `<tr><th align="left" style="padding:4px 12px 4px 0">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`)
    .join("");
  const html = `<html><body style="background:${COLOR["lot-chalk"]};color:${COLOR["lot-ink"]};font-family:Arial,sans-serif;padding:24px"><p>${escapeHtml(partner.introSalutation)}</p><p>${escapeHtml(intro)}</p><p>${escapeHtml(handover)}</p><table>${rows}</table><p>${escapeHtml(note)}</p><p>LotFoundry<br>support@lotfoundry.net</p></body></html>`;
  return { subject, text, html };
}

/** Comma-separated addresses from an env var, trimmed, empties dropped. */
function addressList(value: string | undefined): string[] {
  return (value ?? "").split(",").map((address) => address.trim()).filter(Boolean);
}

export interface PartnerHandoffResult {
  delivery: "sent" | "queued";
  resendId?: string;
  error?: string;
}

/**
 * Email the introduction to the partner's team inbox, copying the partner
 * contacts in `GREATBUILDZ_REFERRAL_CC` and the homeowner. There is no
 * Reply-To, so the partner's reply-all on first contact reaches support@ as
 * well as the homeowner. Never throws: with no Resend key or no intake address
 * configured, or on a provider error, the referral stays `queued` in the
 * ledger for ops to hand off manually.
 */
export async function dispatchPartnerReferral(
  partner: PartnerNetwork,
  referralId: string,
  handoff: PartnerReferralHandoff,
): Promise<PartnerHandoffResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const intake = addressList(process.env.GREATBUILDZ_REFERRAL_EMAIL);
  if (!apiKey || intake.length === 0) return { delivery: "queued" };
  const cc = [...addressList(process.env.GREATBUILDZ_REFERRAL_CC), handoff.homeowner.email];

  const message = renderPartnerReferralEmail(partner, referralId, handoff);
  try {
    const { data, error } = await new Resend(apiKey).emails.send(
      {
        from: "LotFoundry <support@lotfoundry.net>",
        to: intake,
        cc,
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
    // A resubmit is never a retry: a send that timed out may still have reached
    // the partner, so ops resends queued rows by hand after checking Resend.
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

  const status = await deliverReferral(ref, partner, referralId, request.handoff);
  return { referralId, status, duplicate: false };
}

/** Email a new ledger row's introduction and record the outcome. */
async function deliverReferral(
  ref: DocumentReference,
  partner: PartnerNetwork,
  referralId: string,
  handoff: PartnerReferralHandoff,
): Promise<PartnerReferralStatus> {
  const delivery = await dispatchPartnerReferral(partner, referralId, handoff);
  const status: PartnerReferralStatus = delivery.delivery === "sent" ? "sent" : "queued";
  if (status === "queued") {
    // Nothing else surfaces a queued row; ops finds it by this line and sends
    // the introduction by hand (docs/partners/greatbuildz-referral.md).
    console.error(
      `[partner-referral] ${referralId} queued for manual handoff:`,
      delivery.error ?? "no email sent; check RESEND_API_KEY and GREATBUILDZ_REFERRAL_EMAIL",
    );
  }
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
  return status;
}
