import { finishLabels, formatCompactCurrency, type ADUConfig, type FeasibilityResult } from "@/lib/feasibility";
import { MoneyFigure } from "@/components/ui/MoneyFigure";

/** Props for {@link PeekMetrics}. */
export interface PeekMetricsProps {
  /** The feasibility result whose headline figures are shown. */
  result: FeasibilityResult;
  /** The ADU config whose footprint/finish chips are shown. */
  config: ADUConfig;
  /** Whether the parcel is an estimate (shows an "estimated" marker). */
  estimated: boolean;
  /** Optional parcel-fetch error message to surface. */
  parcelError?: string | null;
  /** Optional retry handler shown when there's an error. */
  onRetry?: () => void;
}

/**
 * The always-visible peek strip for the mobile bottom sheet: a full-width rent
 * lead (income framing) followed by a secondary two-up row (build range,
 * payback), config chips, and any parcel error.
 *
 * @param props - The {@link PeekMetricsProps}.
 */
export default function PeekMetrics({ result, config, estimated, parcelError, onRetry }: PeekMetricsProps) {
  return (
    <div>
      {/* Rent leads — money in forest (DESIGN.md: the figure leads every screen,
          and forest is reserved for money). Build cost and payback are secondary,
          not co-equal to income. */}
      <div className="border border-lf-hairline bg-lf-card px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
          Rent potential / mo
        </p>
        <MoneyFigure
          value={result.monthlyRent}
          unit=""
          size="inline"
          tone="forest"
          className="mt-0.5 text-[25px]"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
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
          <span className="rounded-md bg-lf-amber-soft px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-amber-ink">
            estimated
          </span>
        )}
      </div>
      {parcelError && (
        <div
          role="alert"
          className="mt-2 flex items-center justify-between gap-2 rounded-md border border-lf-amber-ink/35 bg-lf-amber-soft px-2.5 py-1.5 text-xs text-lf-amber-ink"
        >
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
    <div className="border border-lf-hairline bg-lf-card px-2.5 py-1.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">{label}</p>
      <p className="font-display text-base font-semibold tabular-nums text-lf-espresso">{value}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-lf-hairline bg-lf-card px-2 py-0.5 font-mono text-[11px] text-lf-espresso">
      {children}
    </span>
  );
}
