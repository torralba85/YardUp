"use client";

import { AlertTriangle, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import type {
  AIPermitStage,
  AIProjectBrief,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
  AIRiskLevel,
} from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { formatCertificatePrice } from "@/lib/certificate-pricing";

export interface AIProjectBriefPanelProps {
  response: AIProjectBriefResponse | null;
  loading: boolean;
  error: string | null;
  onGenerate: (idToken: string) => Promise<AIProjectBriefResponse>;
  /** Route to the Certificate step — the preview tier's unlock CTA. */
  onViewCertificate: () => void;
}

const RISK_TONE: Record<AIRiskLevel, string> = {
  low: "border-lf-hairline text-lf-muted",
  medium: "border-lf-amber-ink/35 bg-lf-amber-soft text-lf-amber-ink",
  high: "border-lf-brick/35 bg-lf-brick-soft text-lf-brick",
};

const STAGE_TONE: Record<AIPermitStage["status"], { label: string; className: string }> = {
  clear: { label: "Clear", className: "border-lf-forest/30 bg-lf-forest-soft text-lf-forest" },
  review: {
    label: "Review",
    className: "border-lf-amber-ink/35 bg-lf-amber-soft text-lf-amber-ink",
  },
  blocker: { label: "Blocker", className: "border-lf-brick/35 bg-lf-brick-soft text-lf-brick" },
};

/** "1 permit stage" / "3 permit stages" — the locked counts read as prose. */
function countNoun(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * One interaction for the parcel interpretation and jurisdiction-grounded
 * approval timeline. The server tiers the response by certificate purchase:
 * non-purchasers get a redacted preview whose locked card sells the unlock,
 * purchasers get the complete brief the studio records into the certificate.
 */
export default function AIProjectBriefPanel({
  response,
  loading,
  error,
  onGenerate,
  onViewCertificate,
}: AIProjectBriefPanelProps) {
  const { user, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  async function handleGenerate() {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    try {
      await onGenerate(await user.getIdToken());
    } catch {
      // The studio owns the visible error so it persists across step changes.
    }
  }

  return (
    <section aria-label="Property notes and timeline" aria-busy={loading} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-clay-ink">
            Property notes
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-lf-espresso">
            One brief for your certificate
          </h3>
        </div>
        <Button
          type="button"
          variant={response ? "secondary" : "primary"}
          size="xs"
          onClick={handleGenerate}
          disabled={loading || authLoading}
          loading={loading}
          leftIcon={<Sparkles size={13} />}
          aria-label={response ? "Refresh property notes and timeline" : "Generate property notes and timeline"}
          className="shrink-0"
        >
          {loading ? "Building" : !user ? "Sign in" : response ? "Refresh" : "Generate"}
        </Button>
      </div>

      {!response && !loading && !error && (
        <div className="rounded-lg border border-lf-hairline bg-lf-sand-2 p-3">
          <p className="text-xs leading-5 text-lf-muted">
            Generate one readout that joins parcel fit, review flags, and a typical approval
            timeline. You&rsquo;ll see a free preview here; the complete brief is recorded in
            your Certificate of Feasibility.
          </p>
          <div className="mt-3 grid grid-cols-[20px_1fr] gap-x-2 gap-y-1.5 border-t border-lf-hairline pt-3">
            <span className="font-mono text-[9px] text-lf-muted">01</span>
            <span className="text-[11px] leading-4 text-lf-espresso">Parcel fit and open questions</span>
            <span className="font-mono text-[9px] text-lf-muted">02</span>
            <span className="text-[11px] leading-4 text-lf-espresso">Permit track and stage ranges</span>
          </div>
        </div>
      )}

      {loading && <ProjectBriefSkeleton />}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs leading-5 text-lf-brick"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {response?.tier === "full" && <ProjectBriefContent brief={response.brief} />}
      {response?.tier === "preview" && (
        <ProjectBriefPreviewContent
          preview={response.preview}
          onViewCertificate={onViewCertificate}
        />
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}

/**
 * The redacted free tier: the narrative hook plus a locked card carrying the
 * honest contents of the complete brief and the certificate unlock CTA.
 */
export function ProjectBriefPreviewContent({
  preview,
  onViewCertificate,
}: {
  preview: AIProjectBriefPreview;
  onViewCertificate: () => void;
}) {
  const price = formatCertificatePrice();
  const lockedLine = [
    countNoun(preview.locked.riskCount, "ranked risk"),
    `${countNoun(preview.locked.stageCount, "permit stage")} with week-by-week timing`,
    countNoun(preview.locked.nextStepCount, "recorded next step"),
  ].join(" · ");

  return (
    <div className="overflow-hidden rounded-lg border border-lf-hairline bg-lf-card">
      <div className="border-b border-lf-hairline bg-lf-sand-2 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-xl font-bold leading-tight text-lf-espresso">
            {preview.headline}
          </h4>
          <span className="shrink-0 rounded-md border border-lf-hairline px-1.5 py-0.5 lf-dataprint text-lf-muted">
            Preview
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-lf-muted">{preview.summary}</p>
      </div>

      <div className="border-b border-lf-hairline p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="lf-dataprint font-bold text-lf-clay-ink">
              Typical approval path
            </p>
            <h5 className="mt-1 text-xs font-semibold text-lf-espresso">{preview.permitTrack.name}</h5>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-display text-[25px] font-bold leading-none text-lf-espresso">
              {preview.totalEstWeeksLow}&ndash;{preview.totalEstWeeksHigh}
            </span>
            <span className="ml-1 font-mono text-[9px] uppercase text-lf-muted">weeks</span>
          </div>
        </div>
        <div className="mt-3 border-t border-lf-hairline pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-lf-espresso">{preview.firstRisk.label}</span>
            <span
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${RISK_TONE[preview.firstRisk.level]}`}
            >
              {preview.firstRisk.level}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-lf-muted">{preview.firstRisk.explanation}</p>
        </div>
      </div>

      <div className="border-b border-lf-hairline p-3.5">
        <div className="rounded-lg border border-dashed border-lf-taupe bg-lf-sand-2 p-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="shrink-0 text-lf-clay-ink" aria-hidden="true" />
            <p className="text-xs font-semibold text-lf-espresso">
              The complete brief is recorded in your certificate
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-lf-muted">
            {lockedLine} &mdash; attached to your engraved Certificate of Feasibility, ready to
            print and share with builders and lenders.
          </p>
          <Button
            type="button"
            variant="commit"
            size="xs"
            fullWidth
            onClick={onViewCertificate}
            className="mt-2.5"
          >
            Unlock with the certificate &mdash; {price}
          </Button>
        </div>
      </div>

      <p className="p-3.5 text-[11px] leading-4 text-lf-muted">{preview.disclaimer}</p>
    </div>
  );
}

export function ProjectBriefContent({ brief }: { brief: AIProjectBrief }) {
  const stages = Array.isArray(brief.stages) ? brief.stages : [];
  const risks = Array.isArray(brief.risks) ? brief.risks : [];
  const nextSteps = Array.isArray(brief.recommendedNextSteps)
    ? brief.recommendedNextSteps
    : [];

  return (
    <div className="overflow-hidden rounded-lg border border-lf-hairline bg-lf-card">
      <div className="border-b border-lf-hairline bg-lf-sand-2 p-3.5">
        <h4 className="font-display text-xl font-bold leading-tight text-lf-espresso">
          {brief.headline}
        </h4>
        <p className="mt-1.5 text-xs leading-5 text-lf-muted">{brief.summary}</p>
      </div>

      <div className="border-b border-lf-hairline p-3.5">
        <p className="lf-dataprint font-bold text-lf-clay-ink">
          Property notes
        </p>
        <p className="mt-1.5 text-xs leading-5 text-lf-espresso">{brief.bestFit}</p>
        {risks.length > 0 && (
          <div className="mt-3 divide-y divide-lf-hairline border-y border-lf-hairline">
            {risks.map((risk) => (
              <div key={`${risk.label}-${risk.level}`} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-lf-espresso">{risk.label}</span>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${RISK_TONE[risk.level]}`}
                  >
                    {risk.level}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-lf-muted">{risk.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-lf-hairline p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="lf-dataprint font-bold text-lf-clay-ink">
              Typical approval path
            </p>
            <h5 className="mt-1 text-xs font-semibold text-lf-espresso">{brief.permitTrack.name}</h5>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-display text-[25px] font-bold leading-none text-lf-espresso">
              {brief.totalEstWeeksLow}&ndash;{brief.totalEstWeeksHigh}
            </span>
            <span className="ml-1 font-mono text-[9px] uppercase text-lf-muted">weeks</span>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-lf-muted">{brief.permitTrack.basis}</p>

        {stages.length > 0 && (
          <ol className="mt-3 space-y-0">
            {stages.map((stage, index) => {
              const tone = STAGE_TONE[stage.status] ?? STAGE_TONE.clear;
              return (
                <li key={`${stage.name}-${index}`} className="relative grid grid-cols-[22px_1fr] gap-2 pb-3 last:pb-0">
                  {index < stages.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[10px] top-5 w-px bg-lf-hairline"
                    />
                  )}
                  <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full border border-lf-hairline bg-lf-card font-mono text-[9px] text-lf-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 border-b border-lf-hairline pb-2.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold leading-4 text-lf-espresso">{stage.name}</span>
                      <span className="shrink-0 font-mono text-[9px] text-lf-muted">
                        {stage.estWeeksLow}&ndash;{stage.estWeeksHigh} WK
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-lf-muted">{stage.description}</p>
                    <span
                      className={`mt-1.5 inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${tone.className}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {nextSteps.length > 0 && (
        <div className="border-b border-lf-hairline p-3.5">
          <p className="lf-dataprint font-bold text-lf-clay-ink">
            Recommended next steps
          </p>
          <ol className="mt-2 space-y-2">
            {nextSteps.map((step, index) => (
              <li key={`${index}-${step}`} className="grid grid-cols-[18px_1fr] gap-2 text-[11px] leading-4 text-lf-muted">
                <span className="font-mono text-[9px] text-lf-taupe">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="p-3.5 text-[11px] leading-4 text-lf-muted">{brief.disclaimer}</p>
    </div>
  );
}

function ProjectBriefSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-lf-hairline bg-lf-sand-2 p-3.5"
    >
      <span className="sr-only">Building property notes and timeline</span>
      <div className="motion-safe:animate-pulse">
        <div className="h-3 w-3/4 rounded bg-lf-taupe-soft" />
        <div className="mt-2 h-2.5 w-full rounded bg-lf-taupe-soft" />
        <div className="mt-1.5 h-2.5 w-5/6 rounded bg-lf-taupe-soft" />
        <div className="my-3 h-px bg-lf-hairline" />
        <div className="space-y-2.5">
          {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
            <div key={width} className="grid grid-cols-[22px_1fr] gap-2">
              <div className="h-[22px] w-[22px] rounded-full bg-lf-taupe-soft" />
              <div className={`mt-1 h-2.5 rounded bg-lf-taupe-soft ${width}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
