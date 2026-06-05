import { BarChart3, CheckCircle2, Home, Layers3, Ruler, SlidersHorizontal } from "lucide-react";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";

export interface MetricsSummaryProps {
  result: FeasibilityResult;
}

export default function MetricsSummary({ result }: MetricsSummaryProps) {
  // Tier 1: money figures lead — larger, heavier display weight.
  // Tier 2: supporting figures sit visually quieter so hierarchy reads at a glance.
  const metrics = [
    {
      icon: Home,
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Local demo estimate",
      valueClass: "font-display font-semibold text-3xl tracking-[-0.03em] text-lf-espresso",
      tier: 1,
    },
    {
      icon: BarChart3,
      label: "Annual NOI",
      value: formatCurrency(result.annualNoi),
      detail: "After expenses & vacancy",
      valueClass: "font-display font-semibold text-3xl tracking-[-0.03em] text-lf-mahogany",
      tier: 1,
    },
    {
      icon: Ruler,
      label: "Build Cost Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `$${result.costPerSqftLow} - $${result.costPerSqftHigh} / sf`,
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
      detailClass: "font-mono",
      tier: 2,
    },
    {
      icon: SlidersHorizontal,
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
      tier: 2,
    },
    {
      icon: Layers3,
      label: "Lot Coverage",
      // Value and detail share one basis — lot coverage vs. the zoning cap —
      // matching report.ts / ReportPreview ("X% of Y% max"). The previous
      // "40% / 1,980 of 2,000 sf" mixed lot-coverage (%) with allowance-used
      // (sf), so one cell told two stories. Turns clay once over the cap.
      value: `${Math.round(result.coveragePercent)}%`,
      detail: `of ${result.maxCoveragePercent}% max`,
      valueClass: `font-mono font-semibold text-xl ${
        result.remainingCapacity < 0 ? "text-lf-clay" : "text-lf-espresso"
      }`,
      detailClass: "font-mono",
      tier: 2,
    },
    {
      icon: CheckCircle2,
      label: "Zoning Status",
      value: result.zoningStatus,
      detail:
        result.zoningStatus === "Compliant" ? "ADU appears allowed" : "Needs review",
      valueClass: `font-sans font-semibold text-xl ${
        result.zoningStatus === "Compliant" ? "text-lf-mahogany" : "text-lf-clay"
      }`,
      tier: 2,
    },
  ];

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="grid grid-cols-2 gap-px border-t border-lf-hairline bg-lf-card sm:grid-cols-3 lg:grid-cols-6"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isLead = metric.tier === 1;
        return (
          <div
            key={metric.label}
            className={`border-b border-lf-hairline px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5 lg:border-b-0 lg:border-r lg:border-lf-hairline last:lg:border-r-0 ${
              isLead ? "bg-lf-sand-2/60" : ""
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-lf-muted sm:text-[11px]">
              <Icon size={13} />
              {metric.label}
            </div>
            <div className={`mt-2 ${metric.valueClass}`}>{metric.value}</div>
            <div className={`mt-0.5 text-[11px] text-lf-muted ${metric.detailClass ?? ""}`}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </section>
  );
}
