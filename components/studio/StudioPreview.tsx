"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { formatCurrency, type FeasibilityResult } from "@/lib/feasibility";
import { Button } from "@/components/ui/Button";

export function rentRangeLabel(result: FeasibilityResult) {
  return result.rentRange
    ? `${formatCurrency(result.rentRange.low)}–${formatCurrency(result.rentRange.high)}`
    : formatCurrency(result.monthlyRent);
}

/**
 * The free preview contains placeholders, never CSS-blurred paid figures.
 * `stickyCta` pins the unlock button to the bottom of the scrolling pane while
 * the preview is on screen (the desktop rail), so it never sits below the fold.
 * Sticky offsets are measured inside the pane's padding, so a -1.25rem bottom
 * cancels the rail's `p-5` and the bar sits flush with the pane edge.
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
        <p className="mt-1.5 text-sm leading-6 text-lot-stone">Explore the 3D concept for free. Unlock this property’s financial model and planning breakdown in your Certificate of Feasibility.</p>
      </div>
      <div className="grid grid-cols-2 gap-px border border-lot-line bg-lot-line">
        {[
          ["Build cost", "$•••–$•••"],
          ["Annual net income", "$••• /yr"],
          ["Payback period", "•• yrs"],
          ["Financed cash flow", "±$••• /mo"],
        ].map(([label, placeholder]) => (
          <div key={label} data-locked-metric="true" className="min-w-0 bg-lot-surface p-3.5">
            <p className="flex items-center gap-2 text-xs text-lot-stone"><Lock size={13} aria-hidden="true" />{label}</p>
            <span aria-hidden="true" className="mt-2.5 block select-none whitespace-nowrap lf-money-sm leading-tight text-lot-ink blur-xs">{placeholder}</span>
            <span className="sr-only">{label} locked in the certificate</span>
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-lot-stone">Answer whether rent covers your loan payment and whether your builder’s scope is complete. Includes cost allowances, financing comparisons, local permit steps, items to verify, a scope checklist, and a site plan PDF.</p>
      {conflict && <p role="alert" className="border-l-2 border-status-blocked pl-3 text-sm leading-5 text-status-blocked"><strong>Current layout conflict.</strong> {conflict}</p>}
      {result.heightReviewRequired && <p role="alert" className="text-sm leading-5 text-status-review">Modeled roof height needs confirmation against local limits. Lower the design or confirm the allowed height.</p>}
      <p className="pb-1 text-xs leading-5 text-lot-stone">Early planning estimates. {caveat} Not permit approval or guaranteed income.</p>
      {consentControl}
      {error && <p role="alert" className="text-sm text-status-blocked">{error}</p>}
      <div className={stickyCta ? "sticky bottom-[-1.25rem] -mx-5 -mb-5 border-t border-lot-line bg-lot-chalk px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6" : undefined}>
        <Button fullWidth variant="primary" onClick={onUnlock} loading={busy} leftIcon={<Lock size={14} />}>{ctaLabel}</Button>
      </div>
      {ctaNote && <p className="text-center text-xs leading-5 text-lot-stone">{ctaNote}</p>}
      {/* The report format is visible before paying, beside the decision rather than only in the page footer. */}
      <p className="text-center">
        <a
          href="/sample-certificate/san-diego"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
        >
          See a sample certificate<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </section>
  );
}
