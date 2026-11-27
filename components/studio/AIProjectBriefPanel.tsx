"use client";

import { AlertTriangle, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type {
  AIPermitStage,
  AIProjectBrief,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
  AIRiskLevel,
} from "@/lib/ai-types";
import { useAuth } from "@/lib/auth-context";
import { useStorePrice } from "@/lib/commerce/store-price";

export interface AIProjectBriefPanelProps {
  response: AIProjectBriefResponse | null;
  loading: boolean;
  error: string | null;
  onGenerate: (idToken: string) => Promise<AIProjectBriefResponse>;
  /** Route to the Certificate step — the preview tier's unlock CTA. */
  onViewCertificate: () => void;
}

const RISK_TONE: Record<AIRiskLevel, string> = {
  low: "border-lot-line text-lot-stone",
  medium: "border-status-review/35 bg-status-review-soft text-status-review",
  high: "border-status-blocked/35 bg-status-blocked-soft text-status-blocked",
};

const STAGE_TONE: Record<AIPermitStage["status"], { label: string; className: string }> = {
  clear: { label: "Clear", className: "border-status-eligible/30 bg-status-eligible-soft text-status-eligible" },
  review: {
    label: "Review",
    className: "border-status-review/35 bg-status-review-soft text-status-review",
  },
  blocker: { label: "Blocker", className: "border-status-blocked/35 bg-status-blocked-soft text-status-blocked" },
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
  const { user, checkoutUser, loading: authLoading } = useAuth();
  const activeUser = checkoutUser ?? user;
  const [authOpen, setAuthOpen] = useState(false);

  async function handleGenerate() {
    if (!activeUser) {
      setAuthOpen(true);
      return;
    }

    try {
      await onGenerate(await activeUser.getIdToken());
    } catch {
      // The studio owns the visible error so it persists across step changes.
    }
  }

  return (
    <section aria-label="Property notes and timeline" aria-busy={loading} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lf-kicker font-bold text-lot-orange-ink">
            Property notes
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-lot-ink">
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
          {loading ? "Building…" : !activeUser ? "Sign in" : response ? "Refresh" : "Generate"}
        </Button>
      </div>

      {!response && !loading && !error && (
        <div className="rounded-none border border-lot-line bg-lot-surface p-3">
          <p className="text-xs leading-5 text-lot-stone">
            Generate one readout that joins parcel fit, review flags, and a typical approval
            timeline. You&rsquo;ll see a free preview here; the complete brief is recorded in
            your Certificate of Feasibility.
          </p>
          <ul className="mt-3 list-disc space-y-1 border-t border-lot-line pl-4 pt-3 text-xs leading-5 text-lot-ink">
            <li>Parcel fit and open questions</li>
            <li>Permit track and stage ranges</li>
          </ul>
        </div>
      )}

      {loading && <ProjectBriefSkeleton />}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs leading-5 text-status-blocked"
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
  // Name a price only when it is the one this channel will bill (see
  // `useStorePrice`: Play charms and localizes its own amount).
  const certPrice = useStorePrice("certificate");
  const lockedLine = [
    countNoun(preview.locked.riskCount, "ranked risk"),
    `${countNoun(preview.locked.stageCount, "permit stage")} with week-by-week timing`,
    countNoun(preview.locked.nextStepCount, "recorded next step"),
  ].join(" · ");

  return (
    <div className="overflow-hidden rounded-none border border-lot-line bg-lot-chalk">
      <div className="border-b border-lot-line bg-lot-surface p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-display text-xl font-medium leading-tight text-lot-ink">
            {preview.headline}
          </h4>
          <span className="shrink-0 rounded-none border border-lot-line px-1.5 py-0.5 lf-dataprint text-lot-stone">
            Preview
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-lot-stone">{preview.summary}</p>
      </div>

      <div className="border-b border-lot-line p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="lf-dataprint font-bold text-lot-orange-ink">
              Typical approval path
            </p>
            <h5 className="mt-1 text-xs font-semibold text-lot-ink">{preview.permitTrack.name}</h5>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-display text-[25px] font-bold leading-none text-lot-ink">
              {preview.totalEstWeeksLow}&ndash;{preview.totalEstWeeksHigh}
            </span>
            <span className="ml-1 font-sans text-[11px] uppercase text-lot-stone">weeks</span>
          </div>
        </div>
        <div className="mt-3 border-t border-lot-line pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-lot-ink">{preview.firstRisk.label}</span>
            <span
              className={`rounded-none border px-1.5 py-0.5 lf-kicker ${RISK_TONE[preview.firstRisk.level]}`}
            >
              {preview.firstRisk.level}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-lot-stone">{preview.firstRisk.explanation}</p>
        </div>
      </div>

      <div className="border-b border-lot-line p-3.5">
        <div className="rounded-none border border-dashed border-lot-stone bg-lot-surface p-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="shrink-0 text-lot-orange-ink" aria-hidden="true" />
            <p className="text-xs font-semibold text-lot-ink">
              The complete brief is recorded in your certificate
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-lot-stone">
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
            Unlock with the certificate
            {certPrice.exact ? ` — ${certPrice.amountCompact}` : ""}
          </Button>
        </div>
      </div>

      <p className="p-3.5 text-[11px] leading-4 text-lot-stone">{preview.disclaimer}</p>
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
    <div className="overflow-hidden rounded-none border border-lot-line bg-lot-chalk">
      <div className="border-b border-lot-line bg-lot-surface p-3.5">
        <h4 className="font-display text-xl font-medium leading-tight text-lot-ink">
          {brief.headline}
        </h4>
        <p className="mt-1.5 text-xs leading-5 text-lot-stone">{brief.summary}</p>
      </div>

      <div className="border-b border-lot-line p-3.5">
        <p className="lf-dataprint font-bold text-lot-orange-ink">
          Property notes
        </p>
        <p className="mt-1.5 text-xs leading-5 text-lot-ink">{brief.bestFit}</p>
        {risks.length > 0 && (
          <div className="mt-3 divide-y divide-lot-line border-y border-lot-line">
            {risks.map((risk) => (
              <div key={`${risk.label}-${risk.level}`} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-lot-ink">{risk.label}</span>
                  <span
                    className={`rounded-none border px-1.5 py-0.5 lf-kicker ${RISK_TONE[risk.level]}`}
                  >
                    {risk.level}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-lot-stone">{risk.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-lot-line p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="lf-dataprint font-bold text-lot-orange-ink">
              Typical approval path
            </p>
            <h5 className="mt-1 text-xs font-semibold text-lot-ink">{brief.permitTrack.name}</h5>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-display text-[25px] font-bold leading-none text-lot-ink">
              {brief.totalEstWeeksLow}&ndash;{brief.totalEstWeeksHigh}
            </span>
            <span className="ml-1 font-sans text-[11px] uppercase text-lot-stone">weeks</span>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-lot-stone">{brief.permitTrack.basis}</p>

        {stages.length > 0 && (
          <ol className="mt-3 space-y-0">
            {stages.map((stage, index) => {
              const tone = STAGE_TONE[stage.status] ?? STAGE_TONE.clear;
              return (
                <li key={`${stage.name}-${index}`} className="relative grid grid-cols-[22px_1fr] gap-2 pb-3 last:pb-0">
                  {index < stages.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[10px] top-5 w-px bg-lot-line"
                    />
                  )}
                  <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-none border border-lot-line bg-lot-chalk font-sans text-[11px] text-lot-stone">
                    {index + 1}
                  </span>
                  <div className="min-w-0 border-b border-lot-line pb-2.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold leading-4 text-lot-ink">{stage.name}</span>
                      <span className="shrink-0 font-sans text-[11px] text-lot-stone">
                        {stage.estWeeksLow}&ndash;{stage.estWeeksHigh} WK
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-lot-stone">{stage.description}</p>
                    <span
                      className={`mt-1.5 inline-flex rounded-none border px-1.5 py-0.5 lf-kicker ${tone.className}`}
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
        <div className="border-b border-lot-line p-3.5">
          <p className="lf-dataprint font-bold text-lot-orange-ink">
            Recommended next steps
          </p>
          <ol className="mt-2 space-y-2">
            {nextSteps.map((step, index) => (
              <li key={`${index}-${step}`} className="grid grid-cols-[18px_1fr] gap-2 text-[11px] leading-4 text-lot-stone">
                <span className="font-sans text-[11px] text-lot-stone">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="p-3.5 text-[11px] leading-4 text-lot-stone">{brief.disclaimer}</p>
    </div>
  );
}

function ProjectBriefSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-none border border-lot-line bg-lot-surface p-3.5"
    >
      <span className="sr-only">Building property notes and timeline</span>
      <div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-2.5 w-full" />
        <Skeleton className="mt-1.5 h-2.5 w-5/6" />
        <div className="my-3 h-px bg-lot-line" />
        <div className="space-y-2.5">
          {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
            <div key={width} className="grid grid-cols-[22px_1fr] gap-2">
              <Skeleton className="h-[22px] w-[22px]" />
              <Skeleton className={`mt-1 h-2.5 ${width}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
