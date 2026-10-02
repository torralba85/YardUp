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
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-lot-ink px-7 py-2.5 text-lot-chalk"
    >
      <div className="flex items-baseline gap-3">
        <span className="lf-kicker-dense text-lot-stone-on-dark">
          If built
        </span>
        <span
          data-income-figure="true"
          className="lf-money-lg text-lot-chalk"
        >
          {formatCurrency(rent)}
          <span className="ml-1 font-sans text-xs text-lot-stone-on-dark">/mo</span>
        </span>
      </div>

      <span
        className="inline-flex items-center gap-1.5 rounded-none px-3 py-1 lf-kicker-dense"
        style={{ backgroundColor: tone.soft, color: tone.onDark }}
      >
        <Icon size={13} />
        {verdict}
      </span>
    </div>
  );
}
