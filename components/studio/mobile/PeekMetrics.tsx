import { finishLabels, formatCompactCurrency, formatCurrency, type ADUConfig, type FeasibilityResult } from "@/lib/feasibility";

export interface PeekMetricsProps {
  result: FeasibilityResult;
  config: ADUConfig;
  estimated: boolean;
  parcelError?: string | null;
  onRetry?: () => void;
}

export default function PeekMetrics({ result, config, estimated, parcelError, onRetry }: PeekMetricsProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Rent / mo" value={formatCurrency(result.monthlyRent)} />
        <Metric
          label="Build"
          value={`${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`}
        />
        <Metric label="Payback" value={`${result.paybackYears} yrs`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip>{config.footprint} ft²</Chip>
        <Chip>{finishLabels[config.finish]}</Chip>
        {estimated && (
          <span className="rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-espresso">
            estimated
          </span>
        )}
      </div>
      {parcelError && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-lf-clay/40 bg-lf-clay/10 px-2.5 py-1.5 text-xs text-lf-espresso">
          <span>{parcelError}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 shrink-0 px-2 font-semibold text-lf-clay underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-lf-hairline bg-white/60 px-2.5 py-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-lf-taupe">{label}</p>
      <p className="font-display text-base font-semibold tabular-nums text-lf-espresso">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-lf-hairline bg-white/60 px-2 py-0.5 text-[11px] text-lf-espresso">
      {children}
    </span>
  );
}
