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
}

/** Compact project context. Detailed figures are available without leaving the design. */
export default function FeasibilityVerdictBand({ parcel, result, config, eyebrow }: FeasibilityVerdictBandProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const Icon = VERDICT_ICON[summary.verdict];
  const [numbersOpen, setNumbersOpen] = useState(false);
  const numbersId = useId();

  return (
    <header className="shrink-0 border-b border-[#DADAD3] bg-[#F5F5F0] text-[#161616]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">{parcel.address}</h2>
          <p className="mt-1 text-xs text-[#65655F]">{eyebrow ? `${eyebrow} · ` : ""}{parcel.lotArea.toLocaleString()} sf lot</p>
        </div>
        <div>
          <p className="lf-kicker-dense text-[#65655F]">If built</p>
          <MoneyFigure value={result.monthlyRent} animate size="inline" tone="forest" className="mt-0.5 text-base font-semibold" />
        </div>
        <div aria-live="polite" className="text-sm">
          <div className="flex items-center gap-2 font-semibold" style={{ color: tone.color }}>
            <Icon size={18} aria-hidden="true" />
            {summary.verdict}
          </div>
          <p className="mt-1 text-xs text-[#65655F]">{summary.reviewNote}</p>
        </div>
        <button type="button" aria-expanded={numbersOpen} aria-controls={numbersId}
          onClick={() => setNumbersOpen(!numbersOpen)}
          className="flex min-h-11 items-center gap-3 rounded-[3px] px-3 text-sm font-semibold hover:bg-[#161616]/5">
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
