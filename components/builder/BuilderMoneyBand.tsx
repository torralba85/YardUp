import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { BuilderMetrics } from "@/lib/builder-metrics";

/**
 * The espresso money band atop the builder desk. Leads with new-lead pipeline
 * value (2A) — the build value still in play — flanked by the new-lead count
 * and month spend. Figures use the on-dark money green; labels are mono taupe.
 */
export default function BuilderMoneyBand({ metrics, credits }: { metrics: BuilderMetrics; credits?: number }) {
  const unlockLabel = `${metrics.unlockedCount} unlock${metrics.unlockedCount === 1 ? "" : "s"}`;

  return (
    <div className="grid grid-cols-1 gap-px bg-lf-espresso text-lf-taupe sm:grid-cols-4">
      <Cell label="New leads" value={String(metrics.newLeadCount)} />
      <Cell
        label="Pipeline value · new"
        value={metrics.pipelineValue > 0 ? formatCompactCurrency(metrics.pipelineValue) : "—"}
        unit="est. build"
        lead
      />
      <Cell label="Spend this month" value={formatCurrency(metrics.spend)} unit={unlockLabel} />
      <Cell label="Lead Credits" value={String(credits ?? 0)} />
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
    <div className="bg-lf-espresso px-6 py-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-lf-taupe">{label}</p>
      <p
        className={`mt-1.5 font-display font-semibold leading-none tabular-nums text-lf-money-on-dark ${
          lead ? "text-[34px]" : "text-[28px]"
        }`}
      >
        {value}
        {unit && <span className="ml-1.5 font-mono text-[11px] text-lf-taupe">{unit}</span>}
      </p>
    </div>
  );
}
