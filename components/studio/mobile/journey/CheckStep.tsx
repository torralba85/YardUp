"use client";

import { discloseFeasibility } from "@/lib/feasibility-disclosure";
import { useEffect, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, SlidersHorizontal, XCircle } from "lucide-react";
import {
  formatCompactCurrency,
  formatCurrency,
  type ADUConfig,
  type FeasibilityResult,
  type Parcel,
} from "@/lib/feasibility";
import {
  summarizeFeasibility,
  verdictTone,
  type VerdictLevel,
} from "@/lib/feasibility-verdict";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { formatPaybackYears } from "@/lib/finance";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/Button";
import { FeasibilityBadge } from "@/components/ui/FeasibilityBadge";
import ParcelDataNotice from "../../ParcelDataNotice";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

const VERDICT_COPY: Record<VerdictLevel, string> = {
  "Likely Feasible": "An ADU looks buildable on this lot under the rules we can check.",
  "Needs Review": "An ADU may fit here, but a few items need review before you commit.",
  Unlikely: "This lot has significant constraints — an ADU is a stretch as configured.",
};

export interface CheckStepProps {
  certificateUnlocked?: boolean;
  parcel: Parcel;
  /** "Address, City" line under the heading. */
  parcelName: string;
  result: FeasibilityResult;
  config: Pick<ADUConfig, "width" | "length">;
  /** Whether the figures describe an estimate (demo lot / estimated parcel). */
  estimated: boolean;
  onFineTune: () => void;
  /** The one primary action: move on to Design. */
  onContinue: () => void;
  onCreateAccount?: () => void;
  emailLinkCard?: ReactNode;
}

/**
 * Reveal 2 · Rules & fit — the payoff right after the address resolves: the
 * rent range, where it comes from, and whether the concept fits, then one
 * primary action on to Design. It matches the desktop Rules & fit step; the
 * paywall lives on the Certificate step, as on desktop (2026-11-27 decision).
 */
export default function CheckStep({
  certificateUnlocked = false,
  parcel,
  parcelName,
  result,
  config,
  estimated,
  onFineTune,
  onContinue,
  onCreateAccount,
  emailLinkCard,
}: CheckStepProps) {
  // The journey's peak moment: the figure landing gets its own haptic, fired
  // once per mount rather than on every rent recalculation.
  useEffect(() => {
    haptic("reveal");
  }, []);

  const disclosure = discloseFeasibility(result, certificateUnlocked);
  const continueButton = (
    <Button
      type="button"
      variant="primary"
      size="lg"
      fullWidth
      rightIcon={<ArrowRight size={16} />}
      onClick={onContinue}
    >
      Design your backyard home
    </Button>
  );

  if (!disclosure.unlocked) {
    const unverified =
      !result.market.verified &&
      result.market.source !== "preset" &&
      result.market.source !== "heuristic";
    const conflict = (result.placement?.status === "blocked" || result.placement?.houseStatus === "close" || result.placement?.houseStatus === "boundary-contact")
      ? result.placement.reasons[0]?.message
      : result.footprintKnown !== false && result.remainingCapacity < 0
        ? "This concept exceeds the modeled size allowance. Adjust the design and confirm local planning rules."
        : undefined;
    const fits = !conflict && result.placement?.status === "fits";
    const caveat = result.footprintKnown === false
      ? "Existing building footprint is unknown; site fit and coverage cannot be confirmed."
      : result.regulationsEstimated
        ? "Zoning, setbacks and coverage are modeling assumptions."
        : "Local rules, site conditions and rent assumptions need confirmation.";

    return (
      <section
        aria-label="Rent and fit"
        className="flex min-h-full flex-col px-5 pt-7"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <p className="lf-kicker text-lot-orange-ink">Step 2 · Rules &amp; fit</p>
        <h2 className="mt-2 font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-[1.1] text-balance text-lot-ink">
          What fits, and what it could rent for
        </h2>
        <p className="mt-1 font-sans text-xs text-lot-stone">{parcelName}</p>

        <div className="mt-6">
          <p className="lf-kicker text-lot-stone">Estimated monthly rent</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-lot-ink">
            {disclosure.rentLabel}<span className="ml-2 text-base font-normal">/mo</span>
          </p>
          <p className="mt-1 font-sans text-xs text-lot-stone">
            Estimated potential for rental income, guest space, or family living.
          </p>
        </div>

        {/* Confidence teaser: where the number comes from, in one line. */}
        <div
          data-testid="earn-confidence"
          className={`mt-4 flex items-start gap-1.5 rounded-none border px-3 py-2.5 font-sans text-xs leading-5 ${
            unverified
              ? "border-status-review/35 bg-status-review-soft text-status-review"
              : "border-lot-line bg-lot-chalk text-lot-stone"
          }`}
        >
          {unverified && <AlertTriangle size={12} className="mt-px shrink-0" aria-hidden="true" />}
          <span>
            {unverified ? "Verified market data unavailable — " : ""}
            {marketProvenanceLine(result.market)}
          </span>
        </div>
        {estimated && (
          <p className="mt-2 text-xs leading-5 text-lot-stone">
            Demo figures — search your address for your own number.
          </p>
        )}
        <ParcelDataNotice parcel={parcel} />

        <div className="mt-5 space-y-2">
          {conflict ? (
            <p role="alert" className="border-l-2 border-status-blocked pl-3 text-sm leading-5 text-status-blocked">
              <strong>Current layout conflict.</strong> {conflict}
            </p>
          ) : fits ? (
            <p className="flex items-start gap-2 text-sm leading-5 text-lot-ink">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-status-eligible" aria-hidden="true" />
              <span><strong className="font-semibold">Fits at this placement.</strong> The concept clears the modeled setbacks.</span>
            </p>
          ) : null}
          {result.heightReviewRequired && (
            <p role="alert" className="text-sm leading-5 text-status-review">
              Modeled roof height needs confirmation against local limits. Lower the design or confirm the allowed height.
            </p>
          )}
          <p className="text-xs leading-5 text-lot-stone">Early planning estimates. {caveat} Not permit approval or guaranteed income.</p>
          <p className="flex items-start gap-2 text-xs leading-5 text-lot-stone">
            <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Build cost, net income, payback and financing for this lot are in your Certificate, step 4.
          </p>
        </div>

        {emailLinkCard && <div className="mt-5">{emailLinkCard}</div>}

        <div className="mt-auto space-y-2 pt-8">
          {onCreateAccount && (
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={onCreateAccount}>
              Save this property — create free account
            </Button>
          )}
          {continueButton}
        </div>
      </section>
    );
  }

  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const Icon = VERDICT_ICON[summary.verdict];
  const openItems = summary.constraints.filter(
    (item) => item.status === "review" || item.status === "blocked",
  );

  const metrics = [
    { label: "Rent / mo", value: formatCurrency(result.monthlyRent) },
    {
      label: "Build range",
      value: `${formatCompactCurrency(result.costLow)}–${formatCompactCurrency(result.costHigh)}`,
    },
    { label: "Payback", value: formatPaybackYears(result.paybackYears, result.annualNoi, "yrs") },
  ];

  return (
    <section
      aria-label="Rent and fit"
      className="flex min-h-full flex-col px-5 pt-7"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="lf-kicker text-lot-orange-ink">Step 2 · Rules &amp; fit</p>

      <div className="mt-3 flex items-center gap-2.5">
        <Icon size={28} style={{ color: tone.color }} aria-hidden="true" />
        <h2
          className="font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-none tracking-[-0.01em] text-balance"
          style={{ color: tone.color }}
        >
          {summary.verdict}
        </h2>
      </div>
      <p className="lf-body-sm mt-2 text-lot-stone">{VERDICT_COPY[summary.verdict]}</p>
      <p className="mt-1 font-sans text-xs text-lot-stone">{parcelName}</p>
      <ParcelDataNotice parcel={parcel} />

      <FeasibilityBadge
        parcel={parcel}
        config={{ footprint: config.width * config.length, width: config.width, length: config.length }}
        surface="light"
      />

      <div className="mt-5 grid grid-cols-3 gap-px border border-lot-line bg-lot-line">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-lot-chalk px-2.5 py-3">
            <p className="lf-dataprint text-lot-stone">{metric.label}</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-lot-ink">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {openItems.length > 0 && (
        <>
          <p className="mt-6 lf-kicker-dense text-lot-stone">Verify before permit</p>
          <ul className="mt-2 flex flex-col gap-2">
            {openItems.map((item) => (
              <li
                key={item.id}
                className={`rounded-none border px-3 py-2.5 text-sm ${
                  item.status === "blocked"
                    ? "border-status-blocked/40 bg-status-blocked-soft text-status-blocked"
                    : "border-status-review/35 bg-status-review-soft text-status-review"
                }`}
              >
                <span className="flex items-start gap-2">
                  {item.status === "blocked" ? (
                    <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="block text-xs">{item.detail}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-5 lf-dataprint text-lot-stone">
        {marketProvenanceLine(result.market)}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onFineTune}
        leftIcon={<SlidersHorizontal size={15} />}
        className="mt-4 self-start text-lot-orange-ink"
      >
        Fine-tune the numbers
      </Button>

      <div className="mt-auto space-y-2 pt-6">
        {onCreateAccount && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onCreateAccount}
          >
            Save this property — create free account
          </Button>
        )}
        {continueButton}
      </div>
    </section>
  );
}
