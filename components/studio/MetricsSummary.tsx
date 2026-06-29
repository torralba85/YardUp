import { BarChart3, CheckCircle2, Home, Layers3, Ruler, SlidersHorizontal } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";
import { useCountUp } from "./use-count-up";

/** Props for {@link MetricsSummary}. */
export interface MetricsSummaryProps {
  /** The feasibility result whose figures are displayed. */
  result: FeasibilityResult;
}

/**
 * The studio's headline metrics block: a lead tier (monthly rent, annual NOI)
 * with animated count-up display numerals, plus a supporting tier (build cost
 * range, payback, etc.) styled per `DESIGN.md`.
 *
 * @param props - The {@link MetricsSummaryProps}.
 */
export default function MetricsSummary({ result }: MetricsSummaryProps) {
  // Lead tier: the two figures that carry the "this is the money" story.
  // Serif display numerals, amber gold-leaf hairline, animated count-up.
  const leads = [
    {
      key: "monthly-rent",
      icon: Home,
      label: "Monthly Rent",
      value: result.monthlyRent,
      format: formatCurrency,
      detail: "Local demo estimate",
    },
    {
      key: "annual-noi",
      icon: BarChart3,
      label: "Annual NOI",
      value: result.annualNoi,
      format: formatCurrency,
      detail: "After expenses & vacancy",
    },
  ] as const;

  // Supporting tier: the statement's fine print — quieter, mono-flavored.
  const support = [
    {
      key: "build-cost",
      icon: Ruler,
      label: "Build Cost Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `$${result.costPerSqftLow} - $${result.costPerSqftHigh} / sf`,
      detailMono: true,
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
    },
    {
      key: "payback",
      icon: SlidersHorizontal,
      label: "Payback",
      value: `${result.paybackYears} yrs`,
      detail: "At mid-range cost",
      detailMono: false,
      valueClass: "font-display font-semibold text-xl tracking-tight text-lf-espresso",
    },
    {
      key: "lot-coverage",
      icon: Layers3,
      label: "Lot Coverage",
      value: `${Math.round(result.coveragePercent)}%`,
      detail: `of ${result.maxCoveragePercent}% max`,
      detailMono: true,
      valueClass: `font-mono font-semibold text-xl ${
        result.remainingCapacity < 0 ? "text-lf-clay" : "text-lf-espresso"
      }`,
    },
    {
      key: "zoning-status",
      icon: CheckCircle2,
      label: "Zoning Status",
      value: result.zoningStatus,
      detail: result.zoningStatus === "Compliant" ? "ADU appears allowed" : "Needs review",
      detailMono: false,
      valueClass: `font-sans font-semibold text-xl ${
        result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-clay"
      }`,
    },
  ] as const;

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="lf-stagger grid grid-cols-2 gap-px border-t border-lf-hairline bg-lf-hairline sm:grid-cols-3 lg:grid-cols-6"
    >
      {leads.map(({ key, ...metric }) => (
        <LeadCell key={key} {...metric} />
      ))}
      {support.map(({ key, ...metric }) => {
        const Icon = metric.icon;
        return (
          <div key={key} className="bg-lf-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
            <CellLabel icon={Icon} label={metric.label} />
            <div className={`mt-2 tabular-nums ${metric.valueClass}`}>{metric.value}</div>
            <div className={`mt-0.5 text-[11px] text-lf-muted ${metric.detailMono ? "font-mono" : ""}`}>
              {metric.detail}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function LeadCell({
  icon: Icon,
  label,
  value,
  format,
  detail,
}: {
  icon: typeof Home;
  label: string;
  value: number;
  format: (n: number) => string;
  detail: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-lf-sand-2 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
      <CellLabel icon={Icon} label={label} />
      <div
        data-metric-lead="true"
        data-accent="amber"
        className="mt-2 inline-block font-display text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-lf-espresso"
      >
        {format(animated)}
        {/* Gold-leaf value hairline — the signature "this is the money" tell. */}
        <span aria-hidden className="mt-1.5 block h-px w-10 bg-lf-amber" />
      </div>
      <div className="mt-2 text-[11px] text-lf-muted">{detail}</div>
    </div>
  );
}

function CellLabel({ icon: Icon, label }: { icon: typeof Home; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-lf-muted sm:text-[11px]">
      <Icon size={13} />
      {label}
    </div>
  );
}
