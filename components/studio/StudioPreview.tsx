"use client";

import type { ReactNode } from "react";
import { rentRangeLabel } from "@/lib/feasibility-disclosure";
import { Lock } from "lucide-react";
import type { FeasibilityResult } from "@/lib/feasibility";
import { Button } from "@/components/ui/Button";

export { rentRangeLabel } from "@/lib/feasibility-disclosure";

const LOCKED_METRICS = ["Build cost", "Annual net income", "Payback period", "Financed cash flow"] as const;

/**
 * The free preview names what the Certificate adds; paid figures are never in the DOM.
 *
 * The decision block (button, terms note and sample link) is one unit. With
 * `stickyCta` it docks to the bottom of the scrolling pane (the desktop rail),
 * so the price and the proof of what it buys never fall below the fold. It must
 * stay the section's last child: its negative bottom margin cancels the
 * section's padding so the bar sits flush, and anything placed after it would
 * be pulled up underneath the bar (the 2026-11-27 sample-link overlap).
 */
export default function StudioPreview({ result, onUnlock, ctaLabel = "See what’s behind the numbers", busy = false, ctaNote, consentControl, error, stickyCta = false }: {
  result: FeasibilityResult;
  onUnlock: () => void;
  ctaLabel?: string;
  busy?: boolean;
  ctaNote?: string;
  consentControl?: ReactNode;
  error?: string | null;
  stickyCta?: boolean;
}) {
  const caveat = result.footprintKnown === false
    ? "Existing building footprint is unknown; site fit and coverage cannot be confirmed."
    : result.regulationsEstimated
      ? "Zoning, setbacks and coverage are modeling assumptions."
      : "Local rules, site conditions and rent assumptions need confirmation.";
  const conflict = (result.placement?.status === "blocked" || result.placement?.houseStatus === "close" || result.placement?.houseStatus === "boundary-contact")
    ? result.placement.reasons[0]?.message
    : result.footprintKnown !== false && result.remainingCapacity < 0
      ? "This concept exceeds the modeled size allowance. Adjust the design and confirm local planning rules."
      : undefined;

  return (
    <section aria-label="Free property preview" className="space-y-4 border border-lot-line bg-lot-chalk p-5 sm:p-6">
      <div>
        <p className="lf-kicker text-lot-stone">Estimated monthly rent</p>
        <p className="mt-1.5 lf-money-lg text-lot-ink">{rentRangeLabel(result)}</p>
        <p className="mt-1.5 text-xs leading-5 text-lot-stone">Conservative to optimistic rent scenarios · {result.rentBasis}</p>
      </div>
      <div>
        <h2 className="font-display text-xl font-medium text-lot-ink">What’s behind your rental potential?</h2>
        <p className="mt-1.5 text-sm leading-6 text-lot-stone">The 3D concept and rent range are free. Your Certificate of Feasibility prices this lot and this design.</p>
      </div>
      {/* One locked panel: the four figures are named once, not each stamped "In your Certificate". */}
      <div className="border border-lot-line bg-lot-surface">
        <p className="flex items-center gap-2 border-b border-lot-line px-3.5 py-2.5 text-xs font-semibold text-lot-ink">
          <Lock size={13} aria-hidden="true" />
          In your Certificate
        </p>
        <ul className="grid grid-cols-2 gap-px bg-lot-line">
          {LOCKED_METRICS.map((label) => (
            <li key={label} data-locked-metric="true" className="min-w-0 bg-lot-surface px-3.5 py-3 text-sm font-semibold leading-tight text-lot-ink">
              <span aria-hidden="true">{label}</span>
              <span className="sr-only">{label} locked in the certificate</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-lot-line px-3.5 py-2.5 text-xs leading-5 text-lot-stone">
          Plus itemized cost allowances, fee and permit checks, a builder scope checklist and a site plan PDF. The free cost calculator shows county averages; the Certificate uses your lot.
        </p>
      </div>
      {conflict && <p role="alert" className="border-l-2 border-status-blocked pl-3 text-sm leading-5 text-status-blocked"><strong>Current layout conflict.</strong> {conflict}</p>}
      {result.heightReviewRequired && <p role="alert" className="text-sm leading-5 text-status-review">Modeled roof height needs confirmation against local limits. Lower the design or confirm the allowed height.</p>}
      <p className="pb-1 text-xs leading-5 text-lot-stone">Early planning estimates. {caveat} Not permit approval or guaranteed income.</p>
      {consentControl}
      {error && <p role="alert" className="text-sm text-status-blocked">{error}</p>}
      {/* The carbon top rule marks a docked bar that content scrolls beneath, so a
          line cut at its edge reads as "more above" rather than a clipping fault. */}
      <div
        data-testid="certificate-decision"
        className={stickyCta
          ? "sticky bottom-[-1.25rem] z-10 -mx-5 -mb-5 border-t border-lot-ink bg-lot-chalk px-5 pb-2 pt-4 sm:-mx-6 sm:-mb-6 sm:px-6"
          : "space-y-1"}
      >
        <Button fullWidth variant="primary" onClick={onUnlock} loading={busy} leftIcon={<Lock size={14} />}>{ctaLabel}</Button>
        {ctaNote && <p className="mt-2 text-center text-xs leading-5 text-lot-stone">{ctaNote}</p>}
        {/* The report format is visible before paying, beside the decision rather than only in the page footer. */}
        <p className="text-center">
          <a
            href="/sample-certificate/san-diego"
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 motion-safe:transition-colors hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          >
            See a sample certificate<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </section>
  );
}
