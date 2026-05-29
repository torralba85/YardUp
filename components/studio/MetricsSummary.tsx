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
      fontClass: "font-display",
      detailClass: "font-mono",
    },
    {
      icon: Home,
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Local demo estimate",
      fontClass: "font-display",
    },
    {
      icon: BarChart3,
      label: "Annual NOI",
      value: formatCurrency(result.annualNoi),
      detail: "After OpEx & vacancy",
      fontClass: "font-display",
    },
    {
      icon: SlidersHorizontal,
      label: "Payback",
      value: `${result.paybackYears}`,
      detail: "Years at mid-range cost",
      fontClass: "font-display",
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
        result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-amber"
      }`,
    },
  ];

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="grid border-t border-lf-hairline bg-lf-card lg:grid-cols-6"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="border-b border-lf-hairline px-6 py-5 lg:border-b-0 lg:border-r lg:border-lf-hairline last:lg:border-r-0"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-lf-muted">
              <Icon size={15} />
              {metric.label}
            </div>
            <div
              className={`mt-2 text-2xl font-semibold tracking-tight text-lf-espresso ${metric.fontClass}`}
            >
              {metric.value}
            </div>
            <div className={`mt-1 text-xs text-lf-muted ${metric.detailClass ?? ""}`}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </section>
  );
}
