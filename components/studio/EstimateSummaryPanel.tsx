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
  /** Error message to display above the CTA button if checkout or generation fails. */
  error?: string | null;
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
  error,
}: EstimateSummaryPanelProps) {
  const metrics = [
    {
      label: "Monthly Rent",
      value: formatCurrency(result.monthlyRent),
      detail: "Current rental assumption",
      icon: Home,
      // Money is measured with neutral ink and tabular figures.
      valueClass: "lf-money-md text-lot-ink",
    },
    {
      label: "Annual Net Income",
      value: formatCurrency(result.annualNoi),
      detail: "After expenses and vacancy",
      icon: BarChart3,
      valueClass: "lf-money-md text-lot-ink",
    },
    {
      label: "Build Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `${formatCurrency(result.costPerSqftLow)}-${formatCurrency(result.costPerSqftHigh)} / sf`,
      icon: Ruler,
      // Cost is not payable income — keep espresso ledger ink.
      valueClass: "lf-money-md text-lot-ink",
    },
    {
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      icon: SlidersHorizontal,
      valueClass: "lf-money-md text-lot-ink",
    },
  ] as const;

  return (
    <aside
      aria-labelledby="estimate-summary-heading"
      className="w-full overflow-hidden rounded-none border border-lot-line bg-lot-chalk"
    >
      <PanelHeader
        as="h2"
        id="estimate-summary-heading"
        title="Estimate Summary"
        sub={`Current feasibility snapshot for ${parcelName}.`}
      />

      <div className="space-y-4 px-6 py-5">
        <div className="rounded-none border border-lot-line bg-lot-surface p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className={result.zoningStatus === "Compliant" ? "text-status-eligible" : "text-status-review"}
            />
            <div>
              <div className="text-sm font-semibold text-lot-ink">
                {result.zoningStatus}
              </div>
              <p className="mt-1 text-xs leading-5 text-lot-stone">
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
                className="rounded-none border border-lot-line bg-lot-chalk p-4"
              >
                <div className="flex items-center gap-2 lf-kicker-dense font-medium text-lot-stone">
                  <Icon size={13} />
                  {metric.label}
                </div>
                <div className={`mt-2 ${metric.valueClass}`}>
                  {metric.value}
                </div>
                <div className="mt-1 text-xs text-lot-stone">{metric.detail}</div>
              </div>
            );
          })}
        </div>

        {result.warnings.length > 0 && (
          <div
            role="alert"
            className="rounded-none border border-status-review/35 bg-status-review-soft p-4 text-status-review"
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

        {error && (
          <div
            role="alert"
            className="rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs text-status-blocked"
          >
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 shrink-0" size={15} />
              <div>
                <div className="text-xs font-semibold">Payment Issue</div>
                <p className="mt-0.5 leading-4">{error}</p>
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
