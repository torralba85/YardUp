"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
import { Button } from "@/components/ui/Button";
import type { FeasibilityResult } from "./types";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
 * Full-viewport modal preview of the Certificate of Feasibility with print,
 * download, export, share, and builder-connect actions.
 *
 * Rendered as a fixed overlay (not an inline bottom strip) so the certificate
 * is never clipped by the studio's flex layout or short viewports.
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Client-only portal gate — avoids SSR HTML mismatch when createPortal runs.
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isClient) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget = autoFocus ? headingRef.current : closeButtonRef.current;
    focusTarget?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus();
    };
  }, [autoFocus, isClient]);

  useEffect(() => {
    if (!isClient) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isClient, onClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-index-modal) flex items-end justify-center bg-lf-espresso/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6 print:static print:bg-transparent print:p-0 print:backdrop-blur-none"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        id="export"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-preview-heading"
        className="flex h-[min(94dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-lf-hairline bg-lf-card shadow-[0_28px_80px_rgba(38,19,7,0.28)] motion-safe:animate-[lf-fade-in_180ms_ease-out] sm:h-auto sm:max-h-[min(92dvh,900px)] sm:rounded-2xl print:h-auto print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
      >
        {/* Sticky chrome: title + primary actions always reachable */}
        <header className="shrink-0 border-b border-lf-hairline bg-lf-card/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 print:static print:border-b print:bg-lf-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="lf-kicker-dense text-lf-clay-ink">LotFoundry</p>
              <h2
                id="report-preview-heading"
                ref={headingRef}
                tabIndex={-1}
                className="lf-panel-heading mt-0.5 text-lf-espresso focus:outline-none"
              >
                Certificate of Feasibility
              </h2>
              <p className="mt-1 truncate text-xs text-lf-muted sm:text-sm">{parcelName}</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2 print:hidden"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="text-[11px]"
              onClick={() => window.print()}
              leftIcon={<Printer size={14} />}
            >
              Print / Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="text-[11px]"
              onClick={onDownload}
              leftIcon={<Download size={14} />}
            >
              Download
            </Button>
            {onExportCsv && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="text-[11px]"
                onClick={onExportCsv}
                leftIcon={<FileSpreadsheet size={14} />}
              >
                CSV Export
              </Button>
            )}
            {onShare && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="text-[11px]"
                onClick={onShare}
                leftIcon={<Share2 size={14} />}
              >
                {shareNotice ?? "Share Link"}
              </Button>
            )}
            {onConnectBuilders && (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="text-[11px]"
                onClick={onConnectBuilders}
                leftIcon={<Hammer size={14} />}
              >
                Connect with builders
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable certificate body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 print:overflow-visible">
          <div className="grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)]">
            <div className="hidden border-[1.5px] border-lf-espresso bg-lf-card p-1 lg:block lg:self-start">
              <div className="border border-lf-taupe px-2.5 py-3 text-center">
                <div className="lf-kicker-dense text-lf-clay-ink">LotFoundry</div>
                <div className="mt-1.5 font-display text-sm font-semibold leading-tight text-lf-espresso">
                  Certificate of Feasibility
                </div>
                <div className="mx-auto mt-2 h-px w-10 bg-lf-hairline" />
                <div className="lf-caption mt-2 truncate text-lf-muted">{parcelName}</div>
                {/* Decorative facsimile thumbnail only — not primary body copy. */}
                <div className="mt-2 inline-block -rotate-3 border border-lf-brick px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-lf-brick">
                  Concept
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="lf-body-sm max-w-2xl text-lf-muted">
                A recorded concept for this lot: the ADU, site fit, estimated costs,
                income summary, property notes, and typical approval timeline—one
                document you can print, share, or bring to a builder. Final scope and
                approvals still need local review.
              </p>

              <div className="mt-4 grid gap-2.5 text-sm text-lf-muted sm:grid-cols-2">
                <ReportFact icon={FileText} text={`${result.aduSqft.toLocaleString()} sf ADU concept`} />
                <ReportFact
                  icon={Ruler}
                  text={`${result.coveragePercent.toFixed(1)}% projected lot coverage`}
                  tone={result.remainingCapacity < 0 ? "blocked" : "default"}
                />
                <ReportFact
                  icon={BarChart3}
                  text={`${formatCurrency(result.annualNoi)} annual net income estimate`}
                  tone="money"
                />
                <ReportFact
                  icon={CheckCircle2}
                  text={`${result.zoningStatus} feasibility status`}
                  tone={result.zoningStatus === "Compliant" ? "clear" : "review"}
                />
              </div>

              <div className="mt-6 border-t border-lf-hairline pt-5">
                <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
                  Certificate includes
                </h3>
                <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-4 gap-y-2 text-xs leading-5 text-lf-muted">
                  {[
                    "Project overview",
                    "Cost estimate range",
                    "Site plan & 3D view",
                    "Rental analysis",
                    "Assumptions",
                    "Zoning & compliance",
                    "Property notes",
                    "Typical approval timeline",
                    "Recommended next steps",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="shrink-0 text-lf-forest" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lf-caption mt-5 rounded-lg border border-lf-hairline/50 bg-lf-sand-2 p-3 text-lf-muted">
                Estimate only. Confirm local zoning, utility constraints, financing, tax treatment,
                and market rents with local professionals before moving forward. No approval or
                income outcome is guaranteed.
              </div>

              <CertificateBriefSection
                brief={projectBrief ?? null}
                loading={projectBriefLoading}
                error={projectBriefError}
              />
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    // tabIndex -1 is intentionally non-tabbable (e.g. programmatic heading focus).
    if (el.tabIndex < 0) return false;
    // offsetParent is null for fixed/hidden nodes; client rects cover both cases.
    return el.getClientRects().length > 0;
  });
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
          <Sparkles size={15} className="text-lf-clay-ink" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-lf-espresso">AI Parcel &amp; Permit Brief</h3>
        </div>
        {loading ? (
          <div className="mt-4 motion-safe:animate-pulse" role="status">
            <span className="sr-only">Adding property notes and timeline</span>
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
            <Sparkles size={15} className="text-lf-clay-ink" aria-hidden="true" />
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
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

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)] lg:gap-0">
        <div className="lg:pr-8">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
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
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
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
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
            Recorded next steps
          </p>
          <ol className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {nextSteps.map((step, index) => (
              <li key={`${index}-${step}`} className="grid grid-cols-[20px_1fr] gap-2 text-xs leading-5 text-lf-muted">
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
  tone = "default",
}: {
  icon: typeof FileText;
  text: string;
  /** Semantic tone for money/status — DESIGN.md forest/amber/brick rules. */
  tone?: "default" | "money" | "clear" | "review" | "blocked";
}) {
  const toneClass =
    tone === "money"
      ? "text-lf-forest font-semibold"
      : tone === "clear"
        ? "text-lf-forest font-semibold"
        : tone === "review"
          ? "text-lf-amber-ink font-semibold"
          : tone === "blocked"
            ? "text-lf-brick font-semibold"
            : "text-lf-muted";
  const iconClass =
    tone === "money" || tone === "clear"
      ? "text-lf-forest"
      : tone === "review"
        ? "text-lf-amber-ink"
        : tone === "blocked"
          ? "text-lf-brick"
          : "text-lf-muted";

  return (
    <div className={`flex items-center gap-2 ${toneClass}`}>
      <Icon size={16} className={`shrink-0 ${iconClass}`} />
      {text}
    </div>
  );
}
