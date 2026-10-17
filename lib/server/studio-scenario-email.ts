import { calculateFeasibility, formatCurrency } from "@/lib/feasibility";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { COLOR } from "@/lib/design-tokens";
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
  const numbers = scenarioHeadlineNumbers(scenario);
  const address = scenario.liveParcel!.address;
  const certificateUrl = new URL(scenarioUrl);
  certificateUrl.searchParams.set("step", "certificate");
  const feeNote = scenario.liveParcel!.state.toUpperCase() === "CA"
    ? numbers.isUnder750SqftFeeWaiver
      ? "Your layout is under 750 sq ft, California's ADU impact-fee exemption threshold. Other fees and local/program exceptions may apply; verify with your city."
      : "Your layout is 750 sq ft or larger. Verify proportional impact fees and any local exemptions with your city."
    : "California's under-750 sq ft impact-fee exemption has not been applied to this property. Check local fees.";
  const rentLabel = numbers.marketVerified ? "Modeled rent range" : "Illustrative rent range (market data unverified)";
  const cost = `${formatCurrency(numbers.buildCostLow)}–${formatCurrency(numbers.buildCostHigh)}`;
  const rent = `${formatCurrency(numbers.monthlyRentLow)}–${formatCurrency(numbers.monthlyRentHigh)}/month`;
  const footer = marketingOptIn
    ? "You requested this layout email and opted in to San Diego / California ADU permit and fee updates. To withdraw that opt-in, contact support@lotfoundry.net."
    : "You requested this one-time layout email. You have not been subscribed to marketing.";
  const text = `Your LotFoundry 3D lot layout\n${address}\n\nOpen Your 3D Lot Layout: ${scenarioUrl}\n\nADU size: ${numbers.sqft} sq ft\nEstimated build range: ${cost}\n${rentLabel}: ${rent}\nRent basis: ${numbers.rentBasis}\n${feeNote}\n\nUnlock the full $29 Certificate of Feasibility: ${certificateUrl}\n\nEarly planning estimates, not permit approval, a bid, or guaranteed rent. Anyone with your link can view the layout and property address. It does not unlock a paid certificate.\n\n${footer}\nLotFoundry · support@lotfoundry.net`;
  const html = `<html><body style="background:${COLOR["lot-chalk"]};color:${COLOR["lot-ink"]};font-family:Arial,sans-serif;padding:24px"><h1>Your 3D lot layout</h1><p>${escapeHtml(address)}</p><p><a href="${escapeHtml(scenarioUrl)}">Open Your 3D Lot Layout</a></p><ul><li>ADU size: ${numbers.sqft} sq ft</li><li>Estimated build range: ${cost}</li><li>${rentLabel}: ${rent}</li></ul><p>Rent basis: ${escapeHtml(numbers.rentBasis)}</p><p>${escapeHtml(feeNote)}</p><p><a href="${escapeHtml(certificateUrl.toString())}">Unlock the full $29 Certificate of Feasibility</a></p><p>Early planning estimates, not permit approval, a bid, or guaranteed rent. Anyone with your link can view the layout and property address. It does not unlock a paid certificate.</p><p>${escapeHtml(footer)}</p><p>LotFoundry · support@lotfoundry.net</p></body></html>`;
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

export async function dispatchScenarioEmail(
  toEmail: string,
  scenario: SavedScenario,
  scenarioUrl: string,
  marketingOptIn: boolean,
  idempotencyToken?: string,
): Promise<SendScenarioEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { delivery: "queued" };
  }

  const message = renderScenarioEmail(scenario, scenarioUrl, marketingOptIn);
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "LotFoundry <support@lotfoundry.net>",
      to: [toEmail],
      replyTo: "support@lotfoundry.net",
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: idempotencyToken ? { "X-Entity-Ref-ID": idempotencyToken } : undefined,
    });

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
