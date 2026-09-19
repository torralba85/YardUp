"use client";

import { Ruler, TriangleAlert } from "lucide-react";

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

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
    <div className="border-t border-[#DADAD3] bg-[#F5F5F0] px-3 py-3 text-[#161616]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[#65655F]">
              Utility trench estimate
            </p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums">
              {safeDistance.toFixed(1)} ft run
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums">
            {dollars(low)}-{dollars(high)}
          </p>
          <p className="mt-1 text-[11px] text-[#65655F]">
            at {dollars(lowRate)}-{dollars(highRate)} / linear ft
          </p>
        </div>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-[#65655F]">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Early site-work allowance only. Utility depth, paving, meters, soils, and agency fees can change the actual cost.
      </p>
    </div>
  );
}
