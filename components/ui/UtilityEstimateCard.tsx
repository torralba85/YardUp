"use client";

import { Ruler, TriangleAlert } from "lucide-react";
import { formatDecimal, formatDollars } from "@/lib/intl-format";

export function UtilityEstimateCard({
  distanceFt,
  lowRate = 65,
  highRate = 120,
}: {
  distanceFt: number;
  lowRate?: number;
  highRate?: number;
}) {
  const safeDistance = Number.isFinite(distanceFt) ? Math.max(distanceFt, 0) : 0;
  const low = Math.round(safeDistance * lowRate);
  const high = Math.round(safeDistance * highRate);

  return (
    <div className="border-t border-lot-line bg-lot-chalk px-3 py-3 text-lot-ink">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-lot-stone">
              Utility trench estimate
            </p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums">
              {formatDecimal(safeDistance, 1)}&nbsp;ft run
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums">
            {formatDollars(low)}-{formatDollars(high)}
          </p>
          <p className="mt-1 text-[11px] text-lot-stone">
            at {formatDollars(lowRate)}-{formatDollars(highRate)} / linear&nbsp;ft
          </p>
        </div>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-lot-stone">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Early site-work allowance only. Utility depth, paving, meters, soils, and agency fees can change the actual cost.
      </p>
    </div>
  );
}
