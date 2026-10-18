"use client";

import { Lock } from "lucide-react";
import { formatCurrency, type FeasibilityResult } from "@/lib/feasibility";
import { Button } from "@/components/ui/Button";

export function rentRangeLabel(result: FeasibilityResult) {
  return result.rentRange
    ? `${formatCurrency(result.rentRange.low)}–${formatCurrency(result.rentRange.high)}`
    : formatCurrency(result.monthlyRent);
}

/** The free preview contains placeholders, never CSS-blurred paid figures. */
export default function StudioPreview({ result, onUnlock, ctaLabel = "See what’s behind the numbers", busy = false, ctaNote, error }: {
  result: FeasibilityResult;
  onUnlock: () => void;
  ctaLabel?: string;
  busy?: boolean;
  ctaNote?: string;
  error?: string | null;
}) {
  const caveat = result.footprintKnown === false
    ? "Existing building footprint is unknown; site fit and coverage cannot be confirmed."
    : result.regulationsEstimated
      ? "Zoning, setbacks and coverage are modeling assumptions."
      : "Local rules, site conditions and rent assumptions need confirmation.";
  const conflict = result.placement?.status === "blocked"
    ? result.placement.reasons[0]?.message
    : result.footprintKnown !== false && !result.regulationsEstimated && result.remainingCapacity < 0
      ? "This concept exceeds the modeled coverage allowance. Adjust the design before relying on this estimate."
      : undefined;

  return (
    <section aria-label="Free property preview" className="space-y-5 border border-lot-line bg-lot-chalk p-5 sm:p-6">
      <div>
        <p className="lf-kicker text-lot-stone">Estimated monthly rent</p>
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-lot-ink">{rentRangeLabel(result)}</p>
        <p className="mt-2 text-xs leading-5 text-lot-stone">Conservative to optimistic rent scenarios · {result.rentBasis}</p>
      </div>
      <div>
        <h2 className="font-display text-xl font-medium text-lot-ink">What’s behind your rental potential?</h2>
        <p className="mt-2 text-sm leading-6 text-lot-stone">Explore the 3D concept for free. Unlock this property’s financial model and planning breakdown in your Certificate of Feasibility.</p>
      </div>
      <div className="grid grid-cols-2 gap-px border border-lot-line bg-lot-line">
        {[
          ["Build cost", "$•••–$•••"],
          ["Annual net income", "$••• /yr"],
          ["Payback period", "•• yrs"],
          ["Financed cash flow", "±$••• /mo"],
        ].map(([label, placeholder]) => (
          <div key={label} data-locked-metric="true" className="min-w-0 bg-lot-surface p-4">
            <p className="flex items-center gap-2 text-xs text-lot-stone"><Lock size={13} aria-hidden="true" />{label}</p>
            <span aria-hidden="true" className="mt-3 block select-none font-display text-xl tabular-nums text-lot-ink blur-xs">{placeholder}</span>
            <span className="sr-only">{label} locked in the certificate</span>
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-lot-stone">Includes cost allowances, financing comparisons, local permit steps, items to verify, and a builder bid checklist.</p>
      {conflict && <p role="alert" className="border-l-2 border-status-blocked pl-3 text-sm leading-5 text-status-blocked"><strong>Current layout conflict.</strong> {conflict}</p>}
      <p className="text-xs leading-5 text-lot-stone">Early planning estimates. {caveat} Not permit approval or guaranteed income.</p>
      {error && <p role="alert" className="text-sm text-status-blocked">{error}</p>}
      <Button fullWidth variant="primary" onClick={onUnlock} disabled={busy} leftIcon={<Lock size={14} />}>{ctaLabel}</Button>
      {ctaNote && <p className="text-center text-xs leading-5 text-lot-stone">{ctaNote}</p>}
    </section>
  );
}
