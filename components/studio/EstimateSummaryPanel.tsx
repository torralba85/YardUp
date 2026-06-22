"use client";

import { BarChart3, CheckCircle2, FileText, Home, Ruler, SlidersHorizontal } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";

/** Props for {@link EstimateSummaryPanel}. */
export interface EstimateSummaryPanelProps {
  /** Display name of the parcel being summarized. */
  parcelName: string;
  /** The feasibility result whose figures are summarized. */
  result: FeasibilityResult;
  /** Called when the user requests report generation. */
  onGenerateReport: () => void;
}

/**
 * The "Estimate Summary" section: a consolidated metrics grid (rent, net
 * income, build range, payback) with a call to generate the feasibility report.
 *
 * @param props - The {@link EstimateSummaryPanelProps}.
 */
export default function EstimateSummaryPanel({
  parcelName,
  result,
  onGenerateReport,
}: EstimateSummaryPanelProps) {
  const metrics = [
    {
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Current rental assumption",
      icon: Home,
    },
    {
      label: "Annual Net Income",
      value: formatCurrency(result.annualNoi),
      detail: "After expenses and vacancy",
      icon: BarChart3,
    },
    {
      label: "Build Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `${formatCurrency(result.costPerSqftLow)}-${formatCurrency(result.costPerSqftHigh)} / sf`,
      icon: Ruler,
    },
    {
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      icon: SlidersHorizontal,
    },
  ] as const;

  return (
    <aside
      aria-labelledby="estimate-summary-heading"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-y-auto lg:w-[404px] lg:border-l"
    >
      <div className="border-b border-lf-hairline px-6 py-5">
        <h2
          id="estimate-summary-heading"
          className="text-2xl font-semibold tracking-tight text-lf-espresso"
        >
          Estimate Summary
        </h2>
        <p className="mt-1 text-sm leading-6 text-lf-muted">
          Current feasibility snapshot for {parcelName}.
        </p>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="rounded-md border border-lf-hairline bg-lf-sand-2 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className={result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-clay"}
            />
            <div>
              <div className="text-sm font-semibold text-lf-espresso">
                {result.zoningStatus}
              </div>
              <p className="mt-1 text-xs leading-5 text-lf-muted">
                {result.zoningStatus === "Compliant"
                  ? "The selected concept appears to fit the current coverage assumptions."
                  : "The selected concept needs local planning review before moving forward."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-md border border-lf-hairline bg-lf-card p-4"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-lf-muted">
                  <Icon size={13} />
                  {metric.label}
                </div>
                <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-lf-espresso">
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-lf-muted">{metric.detail}</div>
              </div>
            );
          })}
        </div>

        {result.warnings.length > 0 && (
          <div role="alert" className="rounded-md border border-lf-clay/40 bg-lf-clay/10 p-4">
            <div className="text-sm font-semibold text-lf-clay">Review Needed</div>
            <p className="mt-1 text-xs leading-5 text-lf-clay">{result.warnings[0]}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerateReport}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-lf-mahogany text-sm font-semibold text-lf-sand-2 transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
        >
          <FileText size={16} />
          Create report
        </button>
      </div>
    </aside>
  );
}
