"use client";

/**
 * FeasibilityVerdictBand — the studio's income-led lead element.
 *
 * The espresso band leads with the monthly rent figure (first and largest —
 * income-led north star per DESIGN.md), followed by the feasibility verdict and
 * a readiness score. Mounts full-width above the parcel scene.
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
import { MoneyFigure } from "@/components/ui/MoneyFigure";
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

  const lotLine = `${parcel.lotArea.toLocaleString()} sf lot · ${parcel.lotWidth}′ × ${parcel.lotLength}′`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 gap-y-3.5 border-b border-[#44443F] bg-[#161616] px-7 py-[18px] text-[#F5F5F0]">
      <div className="min-w-0">
        {eyebrow && (
          <p className="lf-kicker-dense text-[#B7B7AE]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-[3px] font-display text-[31px] font-semibold leading-[1.08] text-[#F5F5F0]">
          {parcel.address}
        </h2>
        <p className="mt-[5px] font-sans text-[11px] tabular-nums text-[#B7B7AE]">{lotLine}</p>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-[22px] gap-y-3">
        {/* Income leads the band: the money figure is typographic in chalk on dark,
            never money-green (A LOT MORE rule §2.6). */}
        <div>
          <p className="lf-kicker-dense text-[#B7B7AE]">
            If built
          </p>
          <MoneyFigure
            value={result.monthlyRent}
            animate
            size="band"
            tone="onDark"
            className="mt-1 text-[#F5F5F0]"
          />
          <p className="mt-1 font-sans text-[10px] tabular-nums text-[#B7B7AE]">{result.rentBasis}</p>
        </div>

        <div className="hidden self-stretch border-l border-[#44443F] sm:block" />

        <div>
          <p className="lf-kicker-dense text-[#B7B7AE]">
            Feasibility verdict
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <Icon size={24} style={{ color: tone.onDark }} />
            <span
              className="whitespace-nowrap font-display text-[31px] font-semibold leading-none tracking-[-0.01em]"
              style={{ color: tone.onDark }}
            >
              {summary.verdict}
            </span>
          </div>
          <div
            className="mt-[7px] flex items-center gap-1.5 font-sans text-[11px] tabular-nums"
            style={{ color: summary.openCount > 0 ? tone.onDark : "#B7B7AE" }}
          >
            {summary.openCount > 0 ? <AlertTriangle size={13} /> : null}
            {summary.reviewNote}
          </div>
        </div>

        <div className="hidden self-stretch border-l border-[#44443F] sm:block" />

        <div className="hidden text-center sm:block">
          <p className="lf-kicker-dense text-[#B7B7AE]">
            Readiness
          </p>
          <div className="mt-0.5 lf-money-xl text-[#F5F5F0]">
            {readiness}
            <span className="font-sans text-sm text-[#B7B7AE]"> /100</span>
          </div>
          <div className="mt-2 h-1 w-[110px] overflow-hidden rounded-full bg-[#212121]">
            <div
              className="h-full w-full origin-left rounded-full motion-safe:transition-transform duration-500"
              style={{ transform: `scaleX(${summary.readiness / 100})`, backgroundColor: tone.onDark }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
