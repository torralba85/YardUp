import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { BuilderMetrics } from "@/lib/builder-metrics";

/**
 * The carbon money band atop the builder desk. Leads with new-lead pipeline
 * value (2A) — the build value still in play — flanked by the new-lead count,
 * total spend and the credit balance. Figures are chalk on carbon (money is
 * typographic, never green); labels are kickers in stone-on-dark, and the
 * cells are split by the on-dark hairline.
 */
export default function BuilderMoneyBand({ metrics, credits }: { metrics: BuilderMetrics; credits?: number }) {
  const unlockLabel = `${metrics.unlockedCount} unlock${metrics.unlockedCount === 1 ? "" : "s"}`;

  return (
    <div className="grid grid-cols-2 gap-px bg-lot-line-dark lg:grid-cols-4">
      <Cell label="New leads" value={String(metrics.newLeadCount)} unit="to review" />
      <Cell
        label="Pipeline value · new"
        value={metrics.pipelineValue > 0 ? formatCompactCurrency(metrics.pipelineValue) : "—"}
        unit="est. build"
        lead
      />
      <Cell label="Total spend" value={formatCurrency(metrics.spend)} unit={unlockLabel} />
      <Cell label="Lead credits" value={String(credits ?? 0)} unit="available" />
    </div>
  );
}

function Cell({
  label,
  value,
  unit,
  lead,
}: {
  label: string;
  value: string;
  unit?: string;
  lead?: boolean;
}) {
  return (
    <div className="min-w-0 bg-lot-ink px-5 py-5 sm:px-6">
      <p className="lf-kicker text-lot-stone-on-dark">{label}</p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`text-lot-chalk ${lead ? "lf-money-xl" : "lf-money-lg"}`}>{value}</span>
        {unit && <span className="lf-caption text-lot-stone-on-dark">{unit}</span>}
      </p>
    </div>
  );
}
