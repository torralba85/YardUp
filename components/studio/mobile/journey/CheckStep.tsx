"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, SlidersHorizontal, XCircle } from "lucide-react";
import {
  formatCompactCurrency,
  formatCurrency,
  type ADUConfig,
  type FeasibilityResult,
  type Parcel,
} from "@/lib/feasibility";
import {
  summarizeFeasibility,
  verdictTone,
  type VerdictLevel,
} from "@/lib/feasibility-verdict";
import { marketProvenanceLine } from "@/lib/market/market-basis";
import { Button } from "@/components/ui/Button";
import { FeasibilityBadge } from "@/components/ui/FeasibilityBadge";

const VERDICT_ICON: Record<VerdictLevel, typeof CheckCircle2> = {
  "Likely Feasible": CheckCircle2,
  "Needs Review": AlertTriangle,
  Unlikely: XCircle,
};

const VERDICT_COPY: Record<VerdictLevel, string> = {
  "Likely Feasible": "An ADU looks buildable on this lot under the rules we can check.",
  "Needs Review": "An ADU may fit here, but a few items need review before you commit.",
  Unlikely: "This lot has significant constraints — an ADU is a stretch as configured.",
};

export interface CheckStepProps {
  parcel: Parcel;
  result: FeasibilityResult;
  config: Pick<ADUConfig, "width" | "length">;
  onFineTune: () => void;
  onContinue: () => void;
  onCreateAccount?: () => void;
}

export default function CheckStep({
  parcel,
  result,
  config,
  onFineTune,
  onContinue,
  onCreateAccount,
}: CheckStepProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const Icon = VERDICT_ICON[summary.verdict];
  const openItems = summary.constraints.filter(
    (item) => item.status === "review" || item.status === "blocked",
  );

  const metrics = [
    { label: "Rent / mo", value: formatCurrency(result.monthlyRent) },
    {
      label: "Build range",
      value: `${formatCompactCurrency(result.costLow)}–${formatCompactCurrency(result.costHigh)}`,
    },
    { label: "Payback", value: `${result.paybackYears} yrs` },
  ];

  return (
    <section
      aria-label="Feasibility check"
      className="flex min-h-full flex-col px-5 pt-7"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="lf-kicker text-lot-orange-ink">Step 4 · Check</p>

      <div className="mt-3 flex items-center gap-2.5">
        <Icon size={28} style={{ color: tone.color }} aria-hidden="true" />
        <h1
          className="font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-none tracking-[-0.01em] text-balance"
          style={{ color: tone.color }}
        >
          {summary.verdict}
        </h1>
      </div>
      <p className="lf-body-sm mt-2 text-lot-stone">{VERDICT_COPY[summary.verdict]}</p>

      <FeasibilityBadge
        parcel={parcel}
        config={{ footprint: config.width * config.length, width: config.width, length: config.length }}
        surface="light"
      />

      <div className="mt-5 grid grid-cols-3 gap-px border border-lot-line bg-lot-line">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-lot-chalk px-2.5 py-3">
            <p className="lf-dataprint text-lot-stone">{metric.label}</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-lot-ink">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {openItems.length > 0 && (
        <>
          <p className="mt-6 lf-kicker-dense text-lot-stone">Verify before permit</p>
          <ul className="mt-2 flex flex-col gap-2">
            {openItems.map((item) => (
              <li
                key={item.id}
                className={`rounded-none border px-3 py-2.5 text-sm ${
                  item.status === "blocked"
                    ? "border-status-blocked/40 bg-status-blocked-soft text-status-blocked"
                    : "border-status-review/35 bg-status-review-soft text-status-review"
                }`}
              >
                <span className="flex items-start gap-2">
                  {item.status === "blocked" ? (
                    <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block font-semibold">{item.label}</span>
                    <span className="block text-xs opacity-90">{item.detail}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-5 lf-dataprint text-lot-stone">
        {marketProvenanceLine(result.market)}
      </p>

      <button
        type="button"
        onClick={onFineTune}
        className="mt-4 inline-flex min-h-11 items-center gap-2 self-start rounded-control px-3 text-sm font-semibold text-lot-orange-ink motion-safe:transition hover:bg-lot-stone-soft"
      >
        <SlidersHorizontal size={15} />
        Fine-tune the numbers
      </button>

      <div className="mt-auto space-y-2 pt-6">
        {onCreateAccount && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onCreateAccount}
          >
            Save this property — create free account
          </Button>
        )}
        <Button
          type="button"
          variant="commit"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight size={16} />}
          onClick={onContinue}
        >
          See your certificate
        </Button>
      </div>
    </section>
  );
}
