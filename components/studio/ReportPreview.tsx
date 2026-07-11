"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Hammer,
  Printer,
  Ruler,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import type { AIPermitStage, AIProjectBrief, AIRiskLevel } from "@/lib/ai-types";
import { formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";

/** Props for {@link ReportPreview}. */
export interface ReportPreviewProps {
  /** Display name of the parcel shown in the report header. */
  parcelName: string;
  /** The feasibility result rendered into the report. */
  result: FeasibilityResult;
  /** Unified AI parcel interpretation and permit timeline. */
  projectBrief?: AIProjectBrief | null;
  projectBriefLoading?: boolean;
  projectBriefError?: string | null;
  /** Called to dismiss the preview. */
  onClose: () => void;
  /** Called to download the report (e.g. text/HTML certificate). */
  onDownload: () => void;
  /** Optional handler to export the report as CSV. */
  onExportCsv?: () => void;
  /** Optional handler to copy/share a link. */
  onShare?: () => void;
  /** Optional handler to start the connect-with-builders flow. */
  onConnectBuilders?: () => void;
  /** Transient status message shown after a share action. */
  shareNotice?: string | null;
  /** Whether to move focus into the dialog on mount. */
  autoFocus?: boolean;
}

/**
 * Modal preview of the feasibility report/certificate with actions to print,
 * download, export CSV, share, and connect with builders.
 *
 * @param props - The {@link ReportPreviewProps}.
 */
export default function ReportPreview({
  parcelName,
  result,
  projectBrief,
  projectBriefLoading = false,
  projectBriefError = null,
  onClose,
  onDownload,
  onExportCsv,
  onShare,
  onConnectBuilders,
  shareNotice,
  autoFocus = false,
}: ReportPreviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocus && headingRef.current) {
      headingRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <section
      id="export"
      aria-labelledby="report-preview-heading"
      className="max-h-[78dvh] overflow-y-auto border-t border-lf-hairline bg-lf-card px-4 py-4 shadow-[0_-18px_40px_rgba(38,19,7,0.05)] sm:px-6 print:shadow-none"
    >
      <div className="grid gap-5 lg:grid-cols-[130px_minmax(260px,1fr)_220px] xl:grid-cols-[140px_minmax(280px,1fr)_230px]">
        <div className="hidden border-[1.5px] border-lf-espresso bg-lf-card p-1 lg:block">
          <div className="border border-lf-taupe px-2.5 py-3 text-center">
            <div className="lf-kicker-dense text-lf-clay">LotFoundry</div>
            <div className="mt-1.5 font-display text-sm font-semibold leading-tight text-lf-espresso">
              Certificate of Feasibility
            </div>
            <div className="mx-auto mt-2 h-px w-10 bg-lf-hairline" />
            <div className="lf-caption mt-2 truncate text-lf-muted">{parcelName}</div>
            <div className="mt-2 inline-block -rotate-3 border border-lf-brick px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-lf-brick">
              Concept
            </div>
          </div>
        </div>

        <div>
          <h2
            id="report-preview-heading"
            ref={headingRef}
            tabIndex={-1}
            className="lf-panel-heading text-lf-espresso focus:outline-none"
          >
            Certificate of Feasibility
          </h2>
          <p className="lf-body-sm mt-1.5 max-w-xl text-lf-muted">
            A recorded concept for this lot: the ADU, its site fit, estimated costs,
            income ledger, AI parcel readout, and typical approval timeline — typeset as
            one document you can print, share, or bring to a builder. Final scope and
            approvals still require local review.
          </p>
          <div className="mt-3 grid gap-2.5 text-sm text-lf-muted sm:grid-cols-2">
            <ReportFact icon={FileText} text={`${result.aduSqft.toLocaleString()} sf ADU concept`} />
            <ReportFact
              icon={Ruler}
              text={`${result.coveragePercent.toFixed(1)}% projected lot coverage`}
            />
            <ReportFact
              icon={BarChart3}
              text={`${formatCurrency(result.annualNoi)} annual net income estimate`}
            />
            <ReportFact icon={CheckCircle2} text={`${result.zoningStatus} feasibility status`} />
          </div>
          <div className="mt-5 border-t border-lf-hairline pt-4">
            <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
              Certificate includes
            </h3>
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-x-4 gap-y-2 text-xs leading-5 text-lf-muted">
            {[
              "Project overview",
              "Cost estimate range",
              "Site plan & 3D view",
              "Rental analysis",
              "Assumptions",
              "Zoning & compliance",
              "AI parcel interpretation",
              "Typical approval timeline",
              "Recorded next steps",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-lf-mahogany" />
                {item}
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-lf-hairline pt-5 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-lf-hairline lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-lf-espresso">Share or Export</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded-full p-1 text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-lf-clay text-[11px] font-semibold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <Printer size={14} />
              Print / Save
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-lf-hairline text-[11px] font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <Download size={14} />
              Download
            </button>
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-lf-hairline text-[11px] font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
              >
                <FileSpreadsheet size={14} />
                CSV Export
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-lf-hairline text-[11px] font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
              >
                <Share2 size={14} />
                <span>{shareNotice ?? "Share Link"}</span>
              </button>
            )}
            {onConnectBuilders && (
              <button
                type="button"
                onClick={onConnectBuilders}
                className="col-span-2 flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-lf-clay text-[11px] font-semibold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
              >
                <Hammer size={14} />
                Connect with local builders
              </button>
            )}
          </div>
          <div className="lf-caption rounded-md border border-lf-hairline/40 bg-lf-sand-2 p-2.5 text-lf-muted">
            Estimate only. Confirm local zoning, utility constraints, financing, tax treatment,
            and market rents with local professionals before moving forward. No approval or
            income outcome is guaranteed.
          </div>
        </div>
      </div>

      <CertificateBriefSection
        brief={projectBrief ?? null}
        loading={projectBriefLoading}
        error={projectBriefError}
      />
    </section>
  );
}

const REPORT_RISK_TONE: Record<AIRiskLevel, string> = {
  low: "border-lf-hairline text-lf-muted",
  medium: "border-lf-amber-ink/35 bg-lf-amber-soft text-lf-amber-ink",
  high: "border-lf-brick/35 bg-lf-brick-soft text-lf-brick",
};

const REPORT_STAGE_TONE: Record<
  AIPermitStage["status"],
  { label: string; className: string }
> = {
  clear: { label: "Clear", className: "text-lf-forest" },
  review: { label: "Review", className: "text-lf-amber-ink" },
  blocker: { label: "Blocker", className: "text-lf-brick" },
};

function CertificateBriefSection({
  brief,
  loading,
  error,
}: {
  brief: AIProjectBrief | null;
  loading: boolean;
  error: string | null;
}) {
  if (!brief) {
    return (
      <div className="mt-6 border-t border-lf-hairline pt-5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-lf-clay" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-lf-espresso">AI Parcel &amp; Permit Brief</h3>
        </div>
        {loading ? (
          <div className="mt-4 motion-safe:animate-pulse" role="status">
            <span className="sr-only">Adding the parcel and timeline brief</span>
            <div className="h-3 w-52 rounded bg-lf-taupe-soft" />
            <div className="mt-2 h-2.5 w-full rounded bg-lf-taupe-soft" />
            <div className="mt-1.5 h-2.5 w-4/5 rounded bg-lf-taupe-soft" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="h-24 rounded-lg border border-lf-hairline bg-lf-sand-2" />
              <div className="h-24 rounded-lg border border-lf-hairline bg-lf-sand-2" />
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs leading-5 text-lf-brick"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error} The parcel facts and financial ledger remain available in this certificate.
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-lf-muted">
            No AI interpretation has been recorded for this version of the parcel and concept.
          </p>
        )}
      </div>
    );
  }

  const risks = Array.isArray(brief.risks) ? brief.risks : [];
  const stages = Array.isArray(brief.stages) ? brief.stages : [];
  const nextSteps = Array.isArray(brief.recommendedNextSteps)
    ? brief.recommendedNextSteps
    : [];

  return (
    <div className="mt-6 border-t border-lf-hairline pt-5" aria-busy={loading}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-lf-clay" aria-hidden="true" />
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
              AI-assisted · Recorded in this certificate
            </p>
          </div>
          <h3 className="mt-1 font-display text-[25px] font-bold leading-tight text-lf-espresso">
            Parcel &amp; Permit Brief
          </h3>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="font-display text-[31px] font-bold leading-none text-lf-espresso">
            {brief.totalEstWeeksLow}&ndash;{brief.totalEstWeeksHigh}
          </span>
          <span className="ml-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
            weeks typical
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs leading-5 text-lf-brick"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error} The last recorded brief is shown below.
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)] lg:gap-0">
        <div className="lg:pr-8">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
            Parcel interpretation
          </p>
          <h4 className="mt-2 text-base font-semibold leading-snug text-lf-espresso">
            {brief.headline}
          </h4>
          <p className="mt-2 text-sm leading-6 text-lf-muted">{brief.summary}</p>

          <div className="mt-4 border-y border-lf-hairline py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
              Best-fit concept
            </p>
            <p className="mt-1.5 text-sm leading-6 text-lf-espresso">{brief.bestFit}</p>
          </div>

          {risks.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
                Items to verify
              </p>
              <div className="mt-2 divide-y divide-lf-hairline border-y border-lf-hairline">
                {risks.map((risk) => (
                  <div key={`${risk.label}-${risk.level}`} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-lf-espresso">{risk.label}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${REPORT_RISK_TONE[risk.level]}`}
                      >
                        {risk.level}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-lf-muted">{risk.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-lf-hairline pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
                Typical approval path
              </p>
              <h4 className="mt-1 text-sm font-semibold text-lf-espresso">
                {brief.permitTrack.name}
              </h4>
            </div>
            <span className="rounded-md border border-lf-hairline bg-lf-sand-2 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
              {brief.permitTrack.type}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-lf-muted">{brief.permitTrack.basis}</p>

          <ol className="mt-4">
            {stages.map((stage, index) => {
              const tone = REPORT_STAGE_TONE[stage.status] ?? REPORT_STAGE_TONE.clear;
              return (
                <li
                  key={`${stage.name}-${index}`}
                  className="relative grid grid-cols-[24px_1fr] gap-3 pb-4 last:pb-0"
                >
                  {index < stages.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[11px] top-6 w-px bg-lf-hairline"
                    />
                  )}
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-lf-hairline bg-lf-card font-mono text-[9px] text-lf-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 border-b border-lf-hairline pb-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold leading-5 text-lf-espresso">
                        {stage.name}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-lf-muted">
                        {stage.estWeeksLow}&ndash;{stage.estWeeksHigh} WK
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-lf-muted">{stage.description}</p>
                    <span
                      className={`mt-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${tone.className}`}
                    >
                      {tone.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {nextSteps.length > 0 && (
        <div className="mt-6 border-t border-lf-hairline pt-5">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
            Recorded next steps
          </p>
          <ol className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {nextSteps.map((step, index) => (
              <li key={step} className="grid grid-cols-[20px_1fr] gap-2 text-xs leading-5 text-lf-muted">
                <span className="font-mono text-[9px] text-lf-taupe">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-5 border-t border-lf-hairline pt-4 text-[11px] leading-5 text-lf-muted">
        {brief.disclaimer}
      </p>
    </div>
  );
}

function ReportFact({
  icon: Icon,
  text,
}: {
  icon: typeof FileText;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-lf-muted" />
      {text}
    </div>
  );
}
