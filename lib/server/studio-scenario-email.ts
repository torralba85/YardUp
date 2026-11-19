import { calculateFeasibility } from "@/lib/feasibility";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { COLOR } from "@/lib/design-tokens";
import { createHash } from "node:crypto";
import { Resend } from "resend";

export function scenarioHeadlineNumbers(scenario: SavedScenario) {
  if (!scenario.liveParcel) throw new Error("A real address is required.");
  const { liveParcel: parcel, config, assumptions } = scenario;
  const result = calculateFeasibility(parcel, config, assumptions);
  const low = calculateFeasibility(parcel, config, { ...assumptions, rentScenario: "conservative" });
  const high = calculateFeasibility(parcel, config, { ...assumptions, rentScenario: "optimistic" });
  return {
    sqft: result.aduSqft,
    buildCostLow: result.costLow, buildCostHigh: result.costHigh,
    monthlyRentLow: Math.min(low.monthlyRent, high.monthlyRent),
    monthlyRentHigh: Math.max(low.monthlyRent, high.monthlyRent),
    isUnder750SqftFeeWaiver: result.aduSqft < 750,
    rentBasis: result.rentBasis,
    marketVerified: result.market.verified,
  };
}

export function renderScenarioEmail(scenario: SavedScenario, scenarioUrl: string, marketingOptIn: boolean) {
  const address = scenario.liveParcel!.address;
  const certificateUrl = new URL(scenarioUrl);
  certificateUrl.searchParams.set("step", "certificate");
  const offer = "Ready to review the numbers? Your $29 Certificate of Feasibility includes build-cost allowances, financing comparisons, planning steps and a builder scope checklist. One-time purchase for this property. No subscription.";
  const disclosure = "This free link restores your layout; it does not unlock the paid analysis. Anyone with the link can view the layout and property address. The Certificate provides early planning estimates, not permit approval or guaranteed income.";
  const footer = marketingOptIn
    ? "You requested this layout email and opted in to San Diego / California ADU permit and fee updates. To withdraw that opt-in, contact support@lotfoundry.net."
    : "You requested this one-time layout email. You have not been subscribed to marketing.";
  const text = `Your LotFoundry 3D lot layout\n${address}\n\nYour layout is saved. Pick up where you left off.\nOpen Your 3D Lot Layout: ${scenarioUrl}\n\n${offer}\nView the $29 Certificate: ${certificateUrl}\n\n${disclosure}\n\n${footer}\nLotFoundry - support@lotfoundry.net`;
  const html = `<html><body style="background:${COLOR["lot-chalk"]};color:${COLOR["lot-ink"]};font-family:Arial,sans-serif;padding:24px"><h1>Your 3D lot layout</h1><p>${escapeHtml(address)}</p><p>Your layout is saved. Pick up where you left off.</p><p><a href="${escapeHtml(scenarioUrl)}">Open Your 3D Lot Layout</a></p><p>${escapeHtml(offer)}</p><p><a href="${escapeHtml(certificateUrl.toString())}">View the $29 Certificate</a></p><p>${escapeHtml(disclosure)}</p><p>${escapeHtml(footer)}</p><p>LotFoundry - support@lotfoundry.net</p></body></html>`;
  return { subject: "Your LotFoundry 3D lot layout", html, text };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export interface SendScenarioEmailResult {
  delivery: "sent" | "queued";
  resendId?: string;
  error?: string;
}

export type ScenarioEmailMessage = ReturnType<typeof renderScenarioEmail>;

/** A slow provider must not hold the request open; the saved link is still returned. */
export const RESEND_SEND_TIMEOUT_MS = 8_000;

/**
 * Send an already-rendered layout email through Resend. Never throws: a missing
 * key, a provider error or a timeout reports "queued" so the caller keeps the
 * saved snapshot and offers the copy link instead.
 */
export async function dispatchScenarioEmail(
  toEmail: string,
  message: ScenarioEmailMessage,
  leadToken: string,
): Promise<SendScenarioEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { delivery: "queued" };
  }

  // The lead token opens the saved layout, so headers and the provider's idempotency
  // store get a one-way reference instead of the token itself.
  const reference = createHash("sha256").update(leadToken).digest("hex").slice(0, 32);
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: "LotFoundry <support@lotfoundry.net>",
        to: [toEmail],
        replyTo: "support@lotfoundry.net",
        subject: message.subject,
        text: message.text,
        html: message.html,
        headers: { "X-Entity-Ref-ID": reference },
      },
      { idempotencyKey: `studio-layout/${reference}`, signal: AbortSignal.timeout(RESEND_SEND_TIMEOUT_MS) },
    );

    if (error) {
      console.error("[dispatchScenarioEmail] Resend error:", error);
      return { delivery: "queued", error: error.message };
    }

    if (data?.id) {
      return { delivery: "sent", resendId: data.id };
    }

    return { delivery: "queued" };
  } catch (err) {
    console.error("[dispatchScenarioEmail] Unexpected error:", err);
    return {
      delivery: "queued",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
