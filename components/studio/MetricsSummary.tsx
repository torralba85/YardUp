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
  const metrics = [
    {
      icon: Ruler,
      label: "Build Cost Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `$${result.costPerSqftLow} - $${result.costPerSqftHigh} / sf`,
      fontClass: "font-serif",
      detailClass: "font-mono",
    },
    {
      icon: Home,
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Local demo estimate",
      fontClass: "font-serif",
    },
    {
      icon: BarChart3,
      label: "Annual NOI",
      value: formatCurrency(result.annualNoi),
      detail: "After OpEx & vacancy",
      fontClass: "font-serif",
    },
    {
      icon: SlidersHorizontal,
      label: "Payback",
      value: `${result.paybackYears}`,
      detail: "Years at mid-range cost",
      fontClass: "font-serif",
    },
    {
      icon: Layers3,
      label: "Coverage Used",
      value: `${Math.round(result.coveragePercent)}%`,
      detail: `${result.totalFootprint.toLocaleString()} sf / ${result.allowedFootprint.toLocaleString()} sf allowed`,
      fontClass: "font-mono text-xl mt-3",
      detailClass: "font-mono",
    },
    {
      icon: CheckCircle2,
      label: "Zoning Status",
      value: result.zoningStatus,
      detail:
        result.zoningStatus === "Compliant" ? "ADU appears allowed" : "Needs review",
      fontClass: `font-sans font-semibold ${
        result.zoningStatus === "Compliant" ? "text-emerald-700" : "text-amber-700"
      }`,
    },
  ];

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="grid border-t border-slate-200 bg-white lg:grid-cols-6"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="border-b border-slate-200 px-6 py-5 lg:border-b-0 lg:border-r last:lg:border-r-0"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Icon size={15} />
              {metric.label}
            </div>
            <div
              className={`mt-2 text-2xl font-semibold tracking-tight text-slate-950 ${metric.fontClass}`}
            >
              {metric.value}
            </div>
            <div className={`mt-1 text-xs text-slate-500 ${metric.detailClass ?? ""}`}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </section>
  );
}
