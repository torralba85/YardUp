"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { formatCurrency, type FeasibilityResult } from "@/lib/feasibility";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import { Button } from "@/components/ui/Button";

/** Props for {@link EarnStep}. */
export interface EarnStepProps {
  /** "Address, City" line for the reveal. */
  parcelName: string;
  /** The feasibility result carrying the money figures + market provenance. */
  result: FeasibilityResult;
  /** Whether the figures describe an estimate (demo lot / estimated parcel). */
  estimated: boolean;
  /** The one primary action: move on to shaping the ADU. */
  onContinue: () => void;
}

/**
 * Reveal 2 · Earn — the emotional payoff, immediately after address
 * resolution: estimated monthly and annual rent potential, followed by a
 * simple confidence teaser (the market basis line). One primary action.
 */
export default function EarnStep({ parcelName, result, estimated, onContinue }: EarnStepProps) {
  const annualGross = result.monthlyRent * 12;
  const unverified =
    !result.market.verified &&
    result.market.source !== "preset" &&
    result.market.source !== "heuristic";

  return (
    <section aria-label="What your backyard could earn" className="flex min-h-full flex-col px-5 pb-8 pt-7">
      <p className="lf-kicker text-lf-clay">Step 2 · Earn</p>
      <h1 className="mt-2 font-display text-[31px] font-semibold leading-[1.08] text-lf-espresso">
        Your backyard could earn
      </h1>
      <p className="mt-1 font-mono text-[11px] text-lf-muted">{parcelName}</p>

      <div className="mt-7">
        <MoneyFigure value={result.monthlyRent} animate size="hero" tone="forest" />
        <p className="mt-3 text-sm text-lf-muted">
          About{" "}
          <span className="font-display text-lg font-semibold text-lf-forest">
            {formatCurrency(annualGross)}
          </span>{" "}
          a year in gross rent from a {result.aduSqft.toLocaleString()} sf backyard home.
        </p>
      </div>

      {/* Confidence teaser: where the number comes from, in one line. */}
      <div
        data-testid="earn-confidence"
        className={`mt-6 flex items-start gap-1.5 rounded-lg border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
          unverified
            ? "border-lf-amber-ink/35 bg-lf-amber-soft text-lf-amber-ink"
            : "border-lf-hairline bg-lf-card text-lf-muted"
        }`}
      >
        {unverified && <TriangleAlert size={12} className="mt-px shrink-0" aria-hidden="true" />}
        <span>
          {unverified ? "Verified market data unavailable — " : ""}
          {marketProvenanceLine(result.market)}
        </span>
      </div>
      {estimated && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
          Demo figures — search your address for your own number.
        </p>
      )}

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
    </section>
  );
}
