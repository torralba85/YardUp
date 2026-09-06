import { BarChart3, CheckCircle2, Home, Layers3, Ruler, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { marketProvenanceLine } from "@/lib/market/market-basis";
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
      detail: result.rentBasis,
    },
    {
      key: "annual-noi",
      icon: BarChart3,
      label: "Annual NOI",
      value: result.annualNoi,
      format: formatCurrency,
      detail: `After ${formatPercent(result.operatingExpenseRatio)} operating expenses`,
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
      valueClass: `font-sans font-semibold text-xl ${
        result.remainingCapacity < 0 ? "text-lf-brick" : "text-lf-espresso"
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
        result.zoningStatus === "Compliant" ? "text-lf-forest" : "text-lf-amber-ink"
      }`,
    },
  ] as const;

  // Sources that never carry a verified-data warning: presets and heuristics
  // are demo territory; live/HUD tiers speak through `verified` instead.
  const unverifiedMarket =
    !result.market.verified &&
    result.market.source !== "preset" &&
    result.market.source !== "heuristic";

  return (
    <section
      id="summary"
      aria-label="Feasibility metrics"
      className="border-t border-lf-hairline"
    >
      <div className="lf-stagger grid grid-cols-2 gap-px bg-lf-hairline sm:grid-cols-3 lg:grid-cols-6">
        {leads.map(({ key, ...metric }) => (
          <LeadCell key={key} {...metric} />
        ))}
        {support.map(({ key, ...metric }) => {
          const Icon = metric.icon;
          return (
            <div key={key} className="bg-lf-card px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
              <CellLabel icon={Icon} label={metric.label} />
              <div className={`mt-2 tabular-nums ${metric.valueClass}`}>{metric.value}</div>
              <div className={`mt-0.5 text-[11px] text-lf-muted ${metric.detailMono ? "font-sans" : ""}`}>
                {metric.detail}
              </div>
            </div>
          );
        })}
      </div>
      {/* Provenance ledger line: where the money figures come from, how fresh
          they are, and whether they trace to a verified local source. */}
      <div
        data-testid="market-provenance"
        className={`flex items-start gap-1.5 border-t border-lf-hairline px-4 py-2 font-sans text-[10px] uppercase tracking-[0.14em] sm:px-5 lg:px-6 ${
          unverifiedMarket ? "bg-lf-amber-soft text-lf-amber-ink" : "bg-lf-sand-2 text-lf-muted"
        }`}
      >
        {unverifiedMarket && <TriangleAlert size={12} className="mt-px shrink-0" aria-hidden="true" />}
        <span>
          {unverifiedMarket ? "Verified market data unavailable — " : ""}
          {marketProvenanceLine(result.market)}
        </span>
      </div>
    </section>
  );
}

/** "32.5%" with the trailing .0 trimmed ("31%", not "31.0%"). */
function formatPercent(ratio: number): string {
  return `${String(Math.round(ratio * 1000) / 10)}%`;
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
        data-accent="forest"
        className="mt-2 inline-block lf-money-lg text-lf-money"
      >
        {format(animated)}
        {/* Forest hairline — money figures carry the forest semantic (DESIGN.md). */}
        <span aria-hidden className="mt-1.5 block h-px w-10 bg-lf-forest" />
      </div>
      <div className="mt-2 text-[11px] text-lf-muted">{detail}</div>
    </div>
  );
}

function CellLabel({ icon: Icon, label }: { icon: typeof Home; label: string }) {
  return (
    <div className="flex items-center gap-1.5 lf-kicker-dense font-medium text-lf-muted sm:text-[11px]">
      <Icon size={13} />
      {label}
    </div>
  );
}
