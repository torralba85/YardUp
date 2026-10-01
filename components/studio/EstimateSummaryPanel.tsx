"use client";

import { BarChart3, CheckCircle2, FileText, Home, Ruler, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
import type { FeasibilityResult } from "./types";

/** Props for {@link EstimateSummaryPanel}. */
export interface EstimateSummaryPanelProps {
  /** Display name of the parcel being summarized. */
  parcelName: string;
  /** The feasibility result whose figures are summarized. */
  result: FeasibilityResult;
  /** Called when the user activates the report/certificate CTA. */
  onGenerateReport: () => void;
  /** CTA label; defaults to "Create report". */
  reportCtaLabel?: string;
  /** Show the CTA in a busy/disabled state (e.g. while starting checkout). */
  reportCtaBusy?: boolean;
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
  reportCtaLabel = "Create report",
  reportCtaBusy = false,
}: EstimateSummaryPanelProps) {
  const metrics = [
    {
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Current rental assumption",
      icon: Home,
      // Income figures: forest only (DESIGN.md money semantic).
      valueClass: "lf-money-md text-lf-money",
    },
    {
      label: "Annual Net Income",
      value: formatCurrency(result.annualNoi),
      detail: "After expenses and vacancy",
      icon: BarChart3,
      valueClass: "lf-money-md text-lf-money",
    },
    {
      label: "Build Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `${formatCurrency(result.costPerSqftLow)}-${formatCurrency(result.costPerSqftHigh)} / sf`,
      icon: Ruler,
      // Cost is not payable income — keep espresso ledger ink.
      valueClass: "lf-money-md text-lf-espresso",
    },
    {
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      icon: SlidersHorizontal,
      valueClass: "lf-money-md text-lf-espresso",
    },
  ] as const;

  return (
    <aside
      aria-labelledby="estimate-summary-heading"
      className="w-full overflow-hidden rounded-none border border-lot-line bg-lf-card"
    >
      <PanelHeader
        as="h2"
        id="estimate-summary-heading"
        title="Estimate Summary"
        sub={`Current feasibility snapshot for ${parcelName}.`}
      />

      <div className="space-y-4 px-6 py-5">
        <div className="rounded-none border border-lot-line bg-lf-sand-2 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className={result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-amber-ink"}
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

        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-none border border-lot-line bg-lf-card p-4"
              >
                <div className="flex items-center gap-2 lf-kicker-dense font-medium text-lf-muted">
                  <Icon size={13} />
                  {metric.label}
                </div>
                <div className={`mt-2 ${metric.valueClass}`}>
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-lf-muted">{metric.detail}</div>
              </div>
            );
          })}
        </div>

        {result.warnings.length > 0 && (
          <div
            role="alert"
            className="rounded-none border border-lf-amber-ink/35 bg-lf-amber-soft p-4 text-lf-amber-ink"
          >
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 shrink-0" size={16} />
              <div>
                <div className="text-sm font-semibold">Review Needed</div>
                <p className="mt-1 text-xs leading-5">{result.warnings[0]}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={onGenerateReport}
          fullWidth
          loading={reportCtaBusy}
          leftIcon={<FileText size={16} />}
        >
          {reportCtaLabel}
        </Button>
      </div>
    </aside>
  );
}
