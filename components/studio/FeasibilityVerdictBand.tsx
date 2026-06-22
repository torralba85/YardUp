"use client";

/**
 * FeasibilityVerdictBand — the redesigned studio's lead element.
 *
 * Replaces the income-led `IncomeLens` framing: the espresso band now leads
 * with the *feasibility verdict* and a readiness score; the income figure is
 * demoted to a secondary line. Mounts full-width above the parcel scene.
 *
 * Derived entirely from real engine output via `summarizeFeasibility`.
 */

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ADUConfig, FeasibilityResult, Parcel } from "@/lib/feasibility";
import {
  summarizeFeasibility,
  verdictTone,
  type VerdictLevel,
} from "@/lib/feasibility-verdict";
import { formatCurrency } from "@/lib/feasibility";
import { useCountUp } from "./use-count-up";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

export interface FeasibilityVerdictBandProps {
  parcel: Parcel;
  result: FeasibilityResult;
  config: Pick<ADUConfig, "width" | "length">;
  /** APN / zone eyebrow line, e.g. "APN 061-244-018 · R-1". */
  eyebrow?: string;
}

export default function FeasibilityVerdictBand({
  parcel,
  result,
  config,
  eyebrow,
}: FeasibilityVerdictBandProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const Icon = VERDICT_ICON[summary.verdict];
  const readiness = useCountUp(summary.readiness);
  const rent = useCountUp(result.monthlyRent);

  const lotLine = `${parcel.lotArea.toLocaleString()} sf lot · ${parcel.lotWidth}′ × ${parcel.lotLength}′`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 gap-y-3.5 bg-lf-espresso px-7 py-[18px] text-lf-sand">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-taupe">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-[3px] font-display text-[32px] font-semibold leading-[1.08] text-lf-sand">
          {parcel.address}
        </h2>
        <p className="mt-[5px] font-mono text-[11px] text-lf-taupe">{lotLine}</p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-[22px]">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-taupe">
            Feasibility verdict
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <Icon size={26} style={{ color: tone.onDark }} />
            <span
              className="whitespace-nowrap font-display text-[36px] font-semibold leading-none tracking-[-0.01em]"
              style={{ color: tone.onDark }}
            >
              {summary.verdict}
            </span>
          </div>
          <div className="mt-[7px] flex items-center gap-1.5 font-mono text-[11px] text-lf-amber">
            <AlertTriangle size={13} />
            {summary.reviewNote}
          </div>
        </div>

        <div className="self-stretch border-l border-lf-taupe/25" />

        <div className="text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-taupe">
            Readiness
          </p>
          <div className="mt-0.5 font-display text-[48px] font-semibold leading-none text-lf-sand tabular-nums">
            {readiness}
            <span className="font-mono text-sm text-lf-taupe"> /100</span>
          </div>
          <div className="mt-2 h-1 w-[110px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${summary.readiness}%`, backgroundColor: tone.onDark }}
            />
          </div>
        </div>

        <div className="hidden border-l border-lf-taupe/25 pl-[22px] xl:block">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-taupe">
            If built
          </p>
          <div className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums text-lf-money-on-dark">
            {formatCurrency(rent)}
            <span className="font-mono text-xs text-lf-taupe">/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
