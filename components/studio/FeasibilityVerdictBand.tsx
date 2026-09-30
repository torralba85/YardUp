"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import type { ADUConfig, FeasibilityResult, Parcel } from "@/lib/feasibility";
import { summarizeFeasibility, verdictTone, type VerdictLevel } from "@/lib/feasibility-verdict";
import { FeasibilityBadge } from "@/components/ui/FeasibilityBadge";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import MetricsSummary from "./MetricsSummary";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

export interface FeasibilityVerdictBandProps {
  parcel: Parcel;
  result: FeasibilityResult;
  config: Pick<ADUConfig, "width" | "length">;
  eyebrow?: string;
  onCreateAccount?: () => void;
}

/** Compact project context. Detailed figures are available without leaving the design. */
export default function FeasibilityVerdictBand({
  parcel,
  result,
  config,
  eyebrow,
  onCreateAccount,
}: FeasibilityVerdictBandProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const Icon = VERDICT_ICON[summary.verdict];
  const [numbersOpen, setNumbersOpen] = useState(false);
  const numbersId = useId();

  return (
    <header className="shrink-0 border-b border-lot-line bg-lot-chalk text-lot-ink">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-medium tracking-tight">{parcel.address}</h2>
          <p className="mt-1 text-xs text-lot-stone">{eyebrow ? `${eyebrow} · ` : ""}{parcel.lotArea.toLocaleString()} sf lot</p>
        </div>
        <div aria-live="polite" className="text-sm">
          <div className="flex items-center gap-2 font-semibold" style={{ color: tone.color }}>
            <Icon size={18} aria-hidden="true" />
            {summary.verdict}
          </div>
          <p className="mt-1 text-xs text-lot-stone">{summary.reviewNote}</p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-lot-stone">Estimated rent</p>
          <MoneyFigure value={result.monthlyRent} animate size="inline" tone="forest" className="mt-0.5 text-base font-semibold" />
        </div>
        {onCreateAccount && (
          <button
            type="button"
            onClick={onCreateAccount}
            className="min-h-11 rounded-[3px] bg-lot-orange-ink px-4 text-sm font-semibold text-lot-chalk motion-safe:transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
          >
            Save this property — free account
          </button>
        )}
        <button type="button" aria-expanded={numbersOpen} aria-controls={numbersId}
          onClick={() => setNumbersOpen(!numbersOpen)}
          className="flex min-h-11 items-center gap-3 rounded-[3px] px-3 text-sm font-semibold hover:bg-lot-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2">
          Numbers &amp; readiness
          <ChevronDown size={16} aria-hidden="true" className={numbersOpen ? "rotate-180" : ""} />
        </button>
      </div>
      <div id={numbersId} hidden={!numbersOpen} className="border-t border-[#DADAD3]">
        <div className="max-h-[45vh] overflow-y-auto pt-4">
          <div className="px-6 pb-4 text-sm">
            <p className="font-semibold">Readiness: {summary.readiness}/100</p>
            <p className="mt-1 text-xs text-[#65655F]">Early planning estimates, not permit approval or guaranteed income.</p>
            <FeasibilityBadge parcel={parcel} config={{ footprint: config.width * config.length, ...config }} surface="light" />
          </div>
          <MetricsSummary result={result} />
        </div>
      </div>
    </header>
  );
}
