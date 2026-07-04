"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import { AIRequestError, requestParcelInsights } from "@/lib/ai-api";
import type { AIParcelInsights } from "@/lib/ai-types";
import type { ADUConfig, FeasibilityResult, Parcel } from "@/lib/feasibility";

export interface AIPropertyInsightsPanelProps {
  parcel: Parcel & { zoning?: string; source?: string };
  result: FeasibilityResult;
  config: ADUConfig;
}

export function createAIPropertyInsightsKey({
  parcel,
  result,
  config,
}: AIPropertyInsightsPanelProps) {
  return [
    parcel.address,
    parcel.city,
    parcel.lotArea,
    parcel.lotWidth,
    parcel.lotLength,
    parcel.existingHouseSqft,
    parcel.maxLotCoveragePercent,
    parcel.setbacks.front,
    parcel.setbacks.rear,
    parcel.setbacks.side,
    parcel.zoning ?? "",
    parcel.source ?? "",
    config.footprint,
    config.width,
    config.length,
    config.height,
    config.roof,
    config.finish,
    config.includeOpenings ? "openings" : "no-openings",
    result.aduSqft,
    result.allowedFootprint,
    result.remainingCapacity,
    result.coveragePercent,
    result.maxCoveragePercent,
    result.zoningStatus,
    result.costLow,
    result.costHigh,
    result.monthlyRent,
    result.annualNoi,
    result.paybackYears,
    result.warnings.join(","),
  ].join("|");
}

export default function AIPropertyInsightsPanel({
  parcel,
  result,
  config,
}: AIPropertyInsightsPanelProps) {
  const [insights, setInsights] = useState<AIParcelInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateInsights() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestParcelInsights({
        parcel,
        config: {
          footprint: config.footprint,
          width: config.width,
          length: config.length,
          height: config.height,
          roof: config.roof,
          finish: config.finish,
        },
        result,
      });
      setInsights(data);
    } catch (err) {
      setError(
        err instanceof AIRequestError
          ? err.userMessage
          : "AI is unavailable right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="AI property insights" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-clay">
            AI property insights
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-lf-espresso">
            Translate the parcel data
          </h3>
        </div>
        <button
          type="button"
          onClick={generateInsights}
          disabled={loading}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-lf-espresso px-3 text-xs font-semibold text-lf-sand transition hover:bg-lf-mahogany disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
        >
          <Sparkles size={13} />
          {loading ? "Reading" : "Generate"}
        </button>
      </div>

      {!insights && !error && (
        <p className="rounded-lg border border-lf-hairline bg-lf-sand-2 p-3 text-xs leading-5 text-lf-muted">
          Generate a plain-English readout using the parcel and feasibility numbers already on screen.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-3 text-xs leading-5 text-lf-brick">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {insights && (
        <div className="space-y-3 rounded-lg border border-lf-hairline bg-lf-sand-2 p-3">
          <div>
            <div className="text-sm font-semibold text-lf-espresso">{insights.headline}</div>
            <p className="mt-1 text-xs leading-5 text-lf-muted">{insights.summary}</p>
          </div>
          <div>
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-muted">
              Best fit
            </div>
            <p className="mt-1 text-xs leading-5 text-lf-espresso">{insights.bestFit}</p>
          </div>
          <div className="space-y-2">
            {insights.risks.map((risk) => (
              <div key={`${risk.label}-${risk.level}`} className="rounded-md border border-lf-hairline bg-lf-card p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-lf-espresso">{risk.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">
                    {risk.level}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-lf-muted">{risk.explanation}</p>
              </div>
            ))}
          </div>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-5 text-lf-muted">
            {insights.recommendedNextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="border-t border-lf-hairline pt-2 text-[11px] leading-4 text-lf-muted">
            {insights.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
