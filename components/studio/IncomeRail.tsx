"use client";

/**
 * IncomeRail — the field book's running header. A slim espresso strip that
 * keeps the asset value ("If built $X,XXX/mo") present on every plate, with a
 * compact verdict pill on the right. The full verdict lives on The Return, so
 * it is never printed twice. The figure animates via the shared count-up hook.
 */

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/feasibility";
import { verdictTone, type VerdictLevel } from "@/lib/feasibility-verdict";
import { useCountUp } from "./use-count-up";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

export interface IncomeRailProps {
  monthlyRent: number;
  verdict: VerdictLevel;
}

export default function IncomeRail({ monthlyRent, verdict }: IncomeRailProps) {
  const rent = useCountUp(monthlyRent);
  const tone = verdictTone(verdict);
  const Icon = VERDICT_ICON[verdict];

  return (
    <div
      data-testid="income-rail"
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-lf-espresso px-7 py-2.5 text-lf-sand"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-lf-taupe">
          If built
        </span>
        <span
          data-income-figure="true"
          className="font-display text-[28px] font-semibold leading-none tabular-nums text-lf-money-on-dark"
        >
          {formatCurrency(rent)}
          <span className="ml-1 font-mono text-xs text-lf-taupe">/mo</span>
        </span>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ backgroundColor: tone.soft, color: tone.onDark }}
      >
        <Icon size={13} />
        {verdict}
      </span>
    </div>
  );
}
