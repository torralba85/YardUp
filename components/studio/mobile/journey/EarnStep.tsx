"use client";

import { useEffect, type ReactNode } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { formatCurrency, type FeasibilityResult } from "@/lib/feasibility";
import { formatNumber } from "@/lib/intl-format";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { discloseFeasibility } from "@/lib/feasibility-disclosure";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import { Button } from "@/components/ui/Button";
import { haptic } from "@/lib/haptics";

/** Props for {@link EarnStep}. */
export interface EarnStepProps {
  certificateUnlocked?: boolean;
  parcelNotice?: ReactNode;
  /** "Address, City" line for the reveal. */
  parcelName: string;
  /** The feasibility result carrying the money figures + market provenance. */
  result: FeasibilityResult;
  /** Whether the figures describe an estimate (demo lot / estimated parcel). */
  estimated: boolean;
  showSampleCertificate?: boolean;
  /** The one primary action: move on to shaping the ADU. */
  onContinue: () => void;
}

/**
 * Reveal 2 · Earn — the emotional payoff, immediately after address
 * resolution: estimated monthly and annual rent potential, followed by a
 * simple confidence teaser (the market basis line). One primary action.
 */
export default function EarnStep({ certificateUnlocked = false, parcelName, result, estimated, showSampleCertificate, onContinue, parcelNotice }: EarnStepProps) {
  const disclosure = discloseFeasibility(result, certificateUnlocked);
  const unverified =
    !result.market.verified &&
    result.market.source !== "preset" &&
    result.market.source !== "heuristic";

  // The journey's peak moment: the figure landing gets its own haptic, fired
  // once per mount rather than on every rent recalculation.
  useEffect(() => {
    haptic("reveal");
  }, []);

  return (
    <section
      aria-label="What a backyard home could rent for"
      className="flex min-h-full flex-col px-5 pt-7"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="lf-kicker text-lot-orange-ink">Step 2 · Rent</p>
      <h2 className="mt-2 font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-[1.1] text-balance text-lot-ink">
        What it could rent for
      </h2>
      <p className="mt-1 font-sans text-xs text-lot-stone">{parcelName}</p>

      <div className="mt-7">
        {disclosure.unlocked ? <MoneyFigure value={disclosure.result.monthlyRent} animate size="hero" tone="onLight" /> : <p className="font-display text-4xl font-semibold tabular-nums text-lot-ink">{disclosure.rentLabel}<span className="ml-2 text-base font-normal">/mo</span></p>}
        {disclosure.unlocked && <p className="mt-3 text-sm text-lot-stone">
          About{" "}
          <span className="font-display text-lg font-semibold text-lot-ink">
            {formatCurrency(disclosure.result.monthlyRent * 12)}
          </span>{" "}
          a year in gross rent from a {formatNumber(result.aduSqft)}&nbsp;sf backyard home.
        </p>}
        <p className="mt-1 font-sans text-xs text-lot-stone">
          Estimated potential for rental income, guest space, or family living.
        </p>
      </div>

      {/* Confidence teaser: where the number comes from, in one line. */}
      <div
        data-testid="earn-confidence"
        className={`mt-6 flex items-start gap-1.5 rounded-none border px-3 py-2.5 font-sans text-xs leading-5 ${
          unverified
            ? "border-status-review/35 bg-status-review-soft text-status-review"
            : "border-lot-line bg-lot-chalk text-lot-stone"
        }`}
      >
        {unverified && <TriangleAlert size={12} className="mt-px shrink-0" aria-hidden="true" />}
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
      {parcelNotice}

      <div className="mt-auto pt-8">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight size={16} />}
          onClick={onContinue}
        >
          Shape your ADU
        </Button>
      </div>
      {showSampleCertificate && (
        <a
          href="/sample-certificate/san-diego"
          target="_blank"
          rel="noopener"
          className="mt-2 inline-flex min-h-11 items-center self-start text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          See sample build cost and payback<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </section>
  );
}
