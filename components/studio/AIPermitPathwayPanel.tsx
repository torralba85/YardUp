"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { AIRequestError, requestPermitPathway } from "@/lib/ai-api";
import type { AIPermitPathway, AIPermitStage } from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import type { ADUConfig, FeasibilityResult, Parcel } from "@/lib/feasibility";

export interface AIPermitPathwayPanelProps {
  parcel: Parcel & { zoning?: string; source?: string };
  result: FeasibilityResult;
  config: ADUConfig;
}

const STAGE_STATUS: Record<AIPermitStage["status"], { label: string; className: string }> = {
  clear: { label: "Clear", className: "text-lf-muted" },
  review: { label: "Review", className: "text-lf-amber-ink" },
  blocker: { label: "Blocker", className: "text-lf-brick" },
};

/**
 * Stable hash of the inputs the permit pathway depends on. Used as a React
 * `key` so a materially different parcel/config/result remounts the panel and
 * clears a now-stale generated pathway.
 */
export function createAIPermitPathwayKey({ parcel, result, config }: AIPermitPathwayPanelProps) {
  return [
    parcel.address,
    parcel.city,
    parcel.zoning ?? "",
    parcel.maxLotCoveragePercent,
    config.footprint,
    config.width,
    config.length,
    config.height,
    config.roof,
    config.finish,
    result.aduSqft,
    result.zoningStatus,
    result.coveragePercent,
    result.maxCoveragePercent,
    result.remainingCapacity,
    result.warnings.join(","),
  ].join("|");
}

export default function AIPermitPathwayPanel({
  parcel,
  result,
  config,
}: AIPermitPathwayPanelProps) {
  const { user, loading: authLoading } = useAuth();
  const [pathway, setPathway] = useState<AIPermitPathway | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function generatePathway() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const data = await requestPermitPathway(
        {
          parcel,
          config: {
            footprint: config.footprint,
            width: config.width,
            length: config.length,
            height: config.height,
            roof: config.roof,
            finish: config.finish,
          },
          result: {
            aduSqft: result.aduSqft,
            zoningStatus: result.zoningStatus,
            coveragePercent: result.coveragePercent,
            maxCoveragePercent: result.maxCoveragePercent,
            remainingCapacity: result.remainingCapacity,
            warnings: result.warnings,
          },
        },
        idToken,
      );
      setPathway(data);
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

  const stages = Array.isArray(pathway?.stages) ? pathway.stages : [];
  const reviewFlags = Array.isArray(pathway?.reviewFlags) ? pathway.reviewFlags : [];
  const recommendedNextSteps = Array.isArray(pathway?.recommendedNextSteps)
    ? pathway.recommendedNextSteps
    : [];

  return (
    <section aria-label="AI permit pathway" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-clay">
            AI permit pathway
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-lf-espresso">
            Map the approval timeline
          </h3>
        </div>
        <button
          type="button"
          onClick={generatePathway}
          disabled={loading || authLoading}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-lf-clay px-3 text-xs font-semibold text-lf-sand transition hover:bg-lf-clay-strong disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
        >
          <Sparkles size={13} />
          {loading ? "Mapping" : user ? "Generate" : "Sign in"}
        </button>
      </div>

      {!pathway && !error && (
        <p className="rounded-lg border border-lf-hairline bg-lf-sand-2 p-3 text-xs leading-5 text-lf-muted">
          {user
            ? "Estimate the likely permit track and review timeline for this jurisdiction, grounded in typical stage durations."
            : "Sign in to generate a permit pathway grounded in typical stage durations."}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-3 text-xs leading-5 text-lf-brick">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {pathway && (
        <div className="space-y-3 rounded-lg border border-lf-hairline bg-lf-sand-2 p-3">
          <div>
            <div className="text-sm font-semibold text-lf-espresso">{pathway.headline}</div>
            <p className="mt-1 text-xs leading-5 text-lf-muted">{pathway.summary}</p>
          </div>

          <div className="rounded-md border border-lf-hairline bg-lf-card p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-lf-espresso">{pathway.track.name}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">
                {pathway.track.type}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-lf-muted">{pathway.track.basis}</p>
          </div>

          <div className="flex items-baseline justify-between border-y border-lf-hairline py-2">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-muted">
              Estimated timeline
            </span>
            <span className="font-display text-lg font-bold leading-none text-lf-espresso">
              {pathway.totalEstWeeksLow}–{pathway.totalEstWeeksHigh}
              <span className="ml-1 font-mono text-[10px] font-medium text-lf-muted">weeks</span>
            </span>
          </div>

          <ol className="space-y-1.5">
            {stages.map((stage, i) => {
              const status = STAGE_STATUS[stage.status] ?? STAGE_STATUS.clear;
              return (
                <li key={`${stage.name}-${i}`} className="flex items-start gap-2">
                  <span className="mt-0.5 font-mono text-[10px] text-lf-taupe">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-lf-espresso">{stage.name}</span>
                      <span className="whitespace-nowrap font-mono text-[10px] text-lf-muted">
                        {stage.estWeeksLow}–{stage.estWeeksHigh} wk
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-start justify-between gap-2">
                      <p className="text-[11px] leading-4 text-lf-muted">{stage.description}</p>
                      <span
                        className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {reviewFlags.length > 0 && (
            <div className="space-y-2">
              {reviewFlags.map((flag) => (
                <div
                  key={`${flag.label}-${flag.level}`}
                  className="rounded-md border border-lf-hairline bg-lf-card p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-lf-espresso">{flag.label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-lf-muted">
                      {flag.level}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-lf-muted">{flag.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {recommendedNextSteps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-5 text-lf-muted">
              {recommendedNextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}

          <p className="border-t border-lf-hairline pt-2 text-[11px] leading-4 text-lf-muted">
            {pathway.disclaimer}
          </p>
        </div>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}
