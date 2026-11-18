"use client";

import { useRef } from "react";
import { constructionBudgetNote, constructionBudgetRows } from "@/lib/finance";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Hammer,
  Info,
  Printer,
  RotateCcw,
  Ruler,
  Share2,
  Sparkles,
  Square,
} from "lucide-react";
import type { AIPermitStage, AIProjectBrief, AIRiskLevel } from "@/lib/ai-types";
import { formatCurrency, type ADUConfig } from "@/lib/feasibility";
import {
  buildCashFlowProForma,
  formatCurrencyRange,
  proFormaFootnote,
  proFormaSummary,
  proFormaTableRows,
} from "@/lib/certificate-pro-forma";
import {
  buildPermitFeeAudit,
  type AuditTone,
  type PermitFeeAudit,
} from "@/lib/certificate-permit-audit";
import { SCOPE_CHECKLIST, SCOPE_CHECKLIST_BUILDERS } from "@/lib/certificate-bid-checklist";
import { buildAduHeightModel } from "@/lib/scene-model";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import type { FeasibilityResult } from "./types";
import { trackReportExported, type FeasibilityStatus } from "@/lib/analytics/events";
import type { Parcel } from "@/lib/parcel-types";
import ParcelDataNotice from "./ParcelDataNotice";

/** Props for {@link ReportPreview}. */
export interface ReportPreviewProps {
  parcel?: Parcel;
  /** Display name of the parcel shown in the report header. */
  parcelName: string;
  /** The feasibility result rendered into the report. */
  result: FeasibilityResult;
  /** The ADU design; its modeled height feeds the permit audit when present. */
  config?: ADUConfig;
  /** Analytics status of the rendered verdict (not the raw zoning status). */
  feasibilityStatus: FeasibilityStatus;
  /** Unified AI parcel interpretation and permit timeline. */
  projectBrief?: AIProjectBrief | null;
  projectBriefSavedAt?: string | null;
  projectBriefLoading?: boolean;
  projectBriefError?: string | null;
  /** Optional style-matched ADU concept. */
  styleMatchConcept?: {
    photoUrl?: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  } | null;
  /** Optional handler to retry generating the project brief on failure. */
  onRetryProjectBrief?: () => void;
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
  parcel,
  parcelName,
  result,
  config,
  feasibilityStatus,
  projectBrief,
  projectBriefSavedAt,
  projectBriefLoading = false,
  projectBriefError = null,
  styleMatchConcept,
  onRetryProjectBrief,
  onClose,
  onDownload,
  onExportCsv,
  onShare,
  onConnectBuilders,
  shareNotice,
  autoFocus = false,
}: ReportPreviewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  const permitAudit = parcel
    ? buildPermitFeeAudit({
        parcel,
        aduSqft: result.aduSqft,
        totalHeightFt: config ? buildAduHeightModel(config)?.totalHeight : null,
      })
    : null;

  return (
    <Dialog
      title="Certificate of Feasibility"
      kicker="LotFoundry"
      description={<span className="block truncate">{parcelName}</span>}
      onClose={onClose}
      closeLabel="Close report preview"
      initialFocus={autoFocus ? headingRef : undefined}
      titleId="report-preview-heading"
      titleRef={headingRef}
      id="export"
      size="xl"
      printable
      toolbar={
        <>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              trackReportExported({
                report_format: "print",
                feasibility_status: feasibilityStatus,
              });
              window.print();
            }}
            leftIcon={<Printer size={14} />}
          >
            Print / Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              trackReportExported({
                report_format: "html",
                feasibility_status: feasibilityStatus,
              });
              onDownload();
            }}
            leftIcon={<Download size={14} />}
          >
            Download
          </Button>
          {onExportCsv && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                trackReportExported({
                  report_format: "csv",
                  feasibility_status: feasibilityStatus,
                });
                onExportCsv();
              }}
              leftIcon={<FileSpreadsheet size={14} />}
            >
              CSV Export
            </Button>
          )}
          {onShare && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                trackReportExported({
                  report_format: "share",
                  feasibility_status: feasibilityStatus,
                });
                onShare();
              }}
              leftIcon={<Share2 size={14} />}
            >
              {shareNotice ?? "Share Link"}
            </Button>
          )}
          {onConnectBuilders && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onConnectBuilders}
              leftIcon={<Hammer size={14} />}
            >
              Connect with builders
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)]">
        <div className="hidden border-[1.5px] border-lot-ink bg-lot-chalk p-1 lg:block lg:self-start">
          <div className="border border-lot-stone px-2.5 py-3 text-center">
            <div className="lf-kicker-dense text-lot-orange-ink">LotFoundry</div>
            <div className="mt-1.5 font-display text-sm font-semibold leading-tight text-lot-ink">
              Certificate of Feasibility
            </div>
            <div className="mx-auto mt-2 h-px w-10 bg-lot-line" />
            <div className="lf-caption mt-2 truncate text-lot-stone">{parcelName}</div>
            {/* Decorative facsimile thumbnail only — not primary body copy. */}
            <div className="mt-2 inline-block -rotate-3 border border-status-blocked px-1.5 py-0.5 font-sans text-[9px] uppercase tracking-[0.08em] text-status-blocked">
              Concept
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="lf-body-sm max-w-2xl text-lot-stone">
            A recorded concept for this lot: the ADU, site fit, estimated costs,
            income summary, property notes, and typical approval timeline—one
            document you can print, share, or bring to a builder. Final scope and
            approvals still need local review.
          </p>

          <div className="mt-4 grid gap-2.5 text-sm text-lot-stone sm:grid-cols-2">
            <ReportFact icon={FileText} text={`${result.aduSqft.toLocaleString()} sf ADU concept`} />
            <ReportFact
              icon={Ruler}
              text={result.footprintKnown === false ? "Lot coverage unknown — existing footprint unavailable" : `${result.coveragePercent.toFixed(1)}% projected lot coverage${result.regulationsEstimated ? " · maximum coverage unverified" : ""}`}
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

          <div className="mt-6 border-t border-lot-line pt-5">
            {parcel && <ParcelDataNotice parcel={parcel} />}
            <h3 className="lf-dataprint text-lot-orange-ink">
              Certificate includes
            </h3>
            <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-4 gap-y-2 text-xs leading-5 text-lot-stone">
              {[
                "Project overview",
                "Cost estimate range",
                "Leveraged cash-flow pro forma",
                ...(permitAudit ? [permitAudit.jurisdiction === "other" ? "Permit fee & submittal audit" : "750 sq ft fee & permit audit"] : []),
                "3-builder scope checklist",
                "Modeled site-fit flags",
                "Rental analysis",
                "Assumptions",
                "Zoning & compliance",
                "AI property notes, when available",
                "Typical approval path, when available",
                "Recommended next steps",
                "Source and rent basis",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-status-eligible" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="lf-caption mt-5 rounded-none border border-lot-line/50 bg-lot-surface p-3 text-lot-stone">
            Estimate only. Confirm local zoning, utility constraints, financing, tax treatment,
            and market rents with local professionals before moving forward. No approval or
            income outcome is guaranteed.
          </div>

          {result.costBreakdown && (
            <section className="mt-6 border-t border-lot-line pt-5" aria-label="Hard and soft cost allowances">
              <h3 className="font-display text-xl font-medium text-lot-ink">Hard &amp; soft cost allowances</h3>
              <dl className="mt-3 divide-y divide-lot-line">
                {[...constructionBudgetRows(result.costBreakdown), ["Central project estimate", result.costBreakdown.total] as [string, number]].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-2 py-2 text-sm text-lot-ink"><dt>{label}</dt><dd className="tabular-nums">{formatCurrency(value)}</dd></div>
                ))}
              </dl>
              <p className="mt-2 text-xs leading-5 text-lot-stone">{constructionBudgetNote}</p>
            </section>
          )}
          <CertificateProFormaSection result={result} />
          {permitAudit && <CertificatePermitAuditSection audit={permitAudit} />}

          {styleMatchConcept && (
            <CertificateStyleMatchSection concept={styleMatchConcept} />
          )}

          {projectBrief && projectBriefSavedAt && (
            <p className="text-xs leading-5 text-lot-stone">
              Saved Brief snapshot. Verify these historical notes against current guidance.
            </p>
          )}
          <CertificateBriefSection
            brief={projectBrief ?? null}
            loading={projectBriefLoading}
            error={projectBriefError}
            onRetry={onRetryProjectBrief}
          />

          <CertificateBidChecklistSection parcelName={parcelName} />
        </div>
      </div>
    </Dialog>
  );
}

const REPORT_RISK_TONE: Record<AIRiskLevel, string> = {
  low: "border-lot-line text-lot-stone",
  medium: "border-status-review/35 bg-status-review-soft text-status-review",
  high: "border-status-blocked/35 bg-status-blocked-soft text-status-blocked",
};

const REPORT_STAGE_TONE: Record<
  AIPermitStage["status"],
  { label: string; className: string }
> = {
  clear: { label: "Clear", className: "text-status-eligible" },
  review: { label: "Review", className: "text-status-review" },
  blocker: { label: "Blocker", className: "text-status-blocked" },
};

function CertificateStyleMatchSection({
  concept,
}: {
  concept: NonNullable<ReportPreviewProps["styleMatchConcept"]>;
}) {
  return (
    <div className="mt-6 border-t border-lot-line pt-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-lot-orange-ink" aria-hidden="true" />
            <p className="lf-dataprint text-lot-orange-ink">
              AI Style Match &middot; Concept Plate
            </p>
          </div>
          <h3 className="mt-1 font-display text-[25px] font-medium leading-tight text-lot-ink">
            {concept.styleName} Concept
          </h3>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="font-display text-[31px] font-bold leading-none text-lot-ink">
            {concept.matchPercentage}%
          </span>
          <span className="ml-1 lf-dataprint text-lot-stone">
            style match
          </span>
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${concept.photoUrl ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {concept.photoUrl && (
          <div className="border border-lot-line bg-lot-surface p-2">
            <span className="mb-2 block font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-lot-stone">
              Reference Home Exterior
            </span>
            <div className="relative aspect-[3/2] w-full overflow-hidden bg-lot-chalk">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={concept.photoUrl}
                alt="Reference Home"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}
        <div className="border border-lot-line bg-lot-surface p-2">
          <span className="mb-2 block font-sans text-[9px] font-semibold uppercase tracking-[0.08em] text-lot-stone">
            Style-Matched ADU Concept
          </span>
          <div className="relative aspect-[3/2] w-full overflow-hidden bg-lot-chalk">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={concept.conceptUrl}
              alt={`${concept.styleName} Concept`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {concept.traits.length > 0 && (
        <div className="mt-4">
          <p className="lf-dataprint text-lot-stone">
            Matched architectural traits
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {concept.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-none border border-lot-line bg-lot-chalk px-2.5 py-1 font-sans text-[10px] font-medium text-lot-ink"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-lot-line pt-3 text-[11px] leading-5 text-lot-stone">
        Conceptual rendering for stylistic and architectural inspiration. Not engineering or construction blueprints.
      </p>
    </div>
  );
}

/** Monthly view of the build financed two ways; shown only inside the purchased certificate. */
function CertificateProFormaSection({ result }: { result: FeasibilityResult }) {
  const proForma = buildCashFlowProForma(result);
  const rows = proFormaTableRows(proForma);

  return (
    <section aria-labelledby="certificate-pro-forma-heading" className="mt-6 border-t border-lot-line pt-5">
      <p className="lf-dataprint text-lot-orange-ink">Monthly cash flow · Modeled financing</p>
      <h3 id="certificate-pro-forma-heading" className="mt-1 font-display text-xl font-medium leading-tight text-lot-ink">
        Leveraged monthly cash-flow pro forma
      </h3>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-lot-stone">
        The {formatCurrencyRange(result.costLow, result.costHigh)} build cost financed two ways,
        against {formatCurrency(proForma.monthlyRent)}/mo gross rent ({result.rentBasis}).
      </p>
      <p className="mt-3 max-w-2xl border-l-2 border-lot-ink pl-3 text-sm leading-6 text-lot-ink">
        {proFormaSummary(proForma)}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-lot-ink">
              <th scope="col" className="py-2 pr-3 text-left">
                <span className="sr-only">Line</span>
              </th>
              {proForma.scenarios.map((row) => (
                <th key={row.scenario.id} scope="col" className="lf-dataprint px-3 py-2 text-right text-lot-stone">
                  {row.scenario.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={row.total ? "border-y-[1.5px] border-lot-ink font-semibold" : "border-b border-lot-line"}
              >
                <th scope="row" className={`py-2 pr-3 text-left text-lot-ink ${row.total ? "font-semibold" : "font-normal"}`}>
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={proForma.scenarios[index].scenario.id} className="px-3 py-2 text-right tabular-nums text-lot-ink">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lf-caption mt-3 text-lot-stone">{proFormaFootnote(proForma)}</p>
    </section>
  );
}

const AUDIT_TONE_ICON: Record<AuditTone, { icon: typeof Info; className: string }> = {
  clear: { icon: CheckCircle2, className: "text-status-eligible" },
  review: { icon: AlertTriangle, className: "text-status-review" },
  info: { icon: Info, className: "text-lot-stone" },
};

/** Fee exposure and submittal paperwork for this size and jurisdiction. */
function CertificatePermitAuditSection({ audit }: { audit: PermitFeeAudit }) {
  const { threshold } = audit;
  return (
    <section aria-labelledby="certificate-permit-audit-heading" className="mt-6 border-t border-lot-line pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lf-dataprint text-lot-orange-ink">Permit &amp; fee trap audit</p>
          <h3 id="certificate-permit-audit-heading" className="mt-1 font-display text-xl font-medium leading-tight text-lot-ink">
            {audit.title}
          </h3>
        </div>
        {audit.jurisdiction !== "other" && (
          <StatusChip
            status={threshold.isExempt ? "clear" : "review"}
            label={threshold.isExempt ? "Within 750 sq ft" : `${threshold.sqftOverLimit.toLocaleString()} sq ft over 750`}
          />
        )}
      </div>
      <ul className="mt-4 divide-y divide-lot-line border-y border-lot-line">
        {audit.feeLines.map((line) => {
          const tone = AUDIT_TONE_ICON[line.tone];
          const Icon = tone.icon;
          return (
            <li key={line.title} className="flex items-start gap-3 py-3">
              <Icon size={15} className={`mt-0.5 shrink-0 ${tone.className}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-lot-ink">{line.title}</p>
                <p className="mt-1 text-xs leading-5 text-lot-stone">{line.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {[
          { heading: "Counter submittal checklist", items: audit.submittalChecklist },
          { heading: "Zoning & overlay checks", items: audit.zoningChecklist },
        ].map((group) => (
          <div key={group.heading}>
            <p className="lf-dataprint text-lot-orange-ink">{group.heading}</p>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-lot-ink">
                  <Square size={13} className="mt-1 shrink-0 text-lot-stone" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {audit.sources.length > 0 && (
        <div className="lf-caption mt-4 flex flex-wrap items-center gap-x-2 text-lot-stone">
          <span>Sources:</span>
          {audit.sources.map((source, index) => (
            <span key={source.url} className="inline-flex items-center">
              {index > 0 && <span className="mr-2 text-lot-stone">·</span>}
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-control text-lot-orange-ink underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
              >
                {source.label}
              </a>
            </span>
          ))}
        </div>
      )}
      <p className="lf-caption mt-2 text-lot-stone">
        A planning checklist, not a fee determination. Confirm each line with the permitting
        jurisdiction and the utility and school district before you budget.
      </p>
    </section>
  );
}

/** Printable RFQ sheet: one row per scope item, one column per builder. */
function CertificateBidChecklistSection({ parcelName }: { parcelName: string }) {
  return (
    <section
      aria-labelledby="certificate-bid-checklist-heading"
      className="mt-6 border-t border-lot-ink pt-5 print:break-before-page"
    >
      <p className="lf-dataprint text-lot-orange-ink">Scope sheet · {parcelName}</p>
      <h3 id="certificate-bid-checklist-heading" className="mt-1 font-display text-xl font-medium leading-tight text-lot-ink">
        Scope Checklist
      </h3>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-lot-stone">
        Give this sheet to three builders. Ask each to mark every line as included, excluded or an
        allowance, and to price it, so the quotes cover the same job.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-lot-ink">
              <th scope="col" className="w-8 py-2 pr-2 text-left">
                <span className="sr-only">Item number</span>
              </th>
              <th scope="col" className="lf-dataprint py-2 pr-3 text-left text-lot-stone">Scope item</th>
              {SCOPE_CHECKLIST_BUILDERS.map((builder) => (
                <th key={builder} scope="col" className="lf-dataprint w-24 px-1 py-2 text-center text-lot-stone">
                  {builder}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCOPE_CHECKLIST.map((item, index) => (
              <tr key={item.id} className="border-b border-lot-line align-top">
                <td className="py-2 pr-2 tabular-nums text-lot-stone">{String(index + 1).padStart(2, "0")}</td>
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <span className="block text-sm font-semibold leading-5 text-lot-ink">{item.title}</span>
                  <span className="mt-0.5 block leading-5 text-lot-stone">{item.ask}</span>
                </th>
                {SCOPE_CHECKLIST_BUILDERS.map((builder) => (
                  <td key={builder} className="px-1 py-1 text-center">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <Checkbox
                        aria-label={`${builder} includes ${item.title}`}
                      />
                    </label>
                    <span className="hidden text-lot-stone print:block">$______</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lf-caption mt-3 text-lot-stone">
        Tick a box when that builder&apos;s quote includes the line. Wherever a line is an allowance,
        ask for the amount in writing.
      </p>
    </section>
  );
}

function CertificateBriefSection({
  brief,
  loading,
  error,
  onRetry,
}: {
  brief: AIProjectBrief | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  if (!brief) {
    return (
      <div className="mt-6 border-t border-lot-line pt-5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-lot-orange-ink" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-lot-ink">AI Parcel &amp; Permit Brief</h3>
        </div>
        {loading ? (
          <div className="mt-4" role="status">
            <span className="sr-only">Adding property notes and timeline</span>
            <Skeleton className="h-3 w-52" />
            <Skeleton className="mt-2 h-2.5 w-full" />
            <Skeleton className="mt-1.5 h-2.5 w-4/5" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 border border-lot-line bg-lot-surface" />
              <Skeleton className="h-24 border border-lot-line bg-lot-surface" />
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-3 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs leading-5 text-status-blocked"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {error} The parcel facts and financial ledger remain available in this certificate.
              </span>
            </div>
            {onRetry && (
              <div className="mt-2.5 pl-5">
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-status-blocked/50 bg-transparent px-3 py-2 text-xs font-medium text-status-blocked hover:bg-status-blocked/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-blocked motion-safe:transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} className={loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
                  <span>Try again</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-lot-stone">
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
    <div className="mt-6 border-t border-lot-line pt-5" aria-busy={loading}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-lot-orange-ink" aria-hidden="true" />
            <p className="lf-dataprint text-lot-orange-ink">
              AI-assisted · Recorded in this certificate
            </p>
          </div>
          <h3 className="mt-1 font-display text-[25px] font-medium leading-tight text-lot-ink">
            Parcel &amp; Permit Brief
          </h3>
        </div>
        <div className="shrink-0 sm:text-right">
          <span className="font-display text-[31px] font-bold leading-none text-lot-ink">
            {brief.totalEstWeeksLow}&ndash;{brief.totalEstWeeksHigh}
          </span>
          <span className="ml-1 lf-dataprint text-lot-stone">
            weeks typical
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs leading-5 text-status-blocked"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error} The last recorded brief is shown below.
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)] lg:gap-0">
        <div className="lg:pr-8">
          <p className="lf-dataprint text-lot-orange-ink">
            Parcel interpretation
          </p>
          <h4 className="mt-2 text-base font-semibold leading-snug text-lot-ink">
            {brief.headline}
          </h4>
          <p className="mt-2 text-sm leading-6 text-lot-stone">{brief.summary}</p>

          <div className="mt-4 border-y border-lot-line py-3">
            <p className="lf-dataprint text-lot-stone">
              Best-fit concept
            </p>
            <p className="mt-1.5 text-sm leading-6 text-lot-ink">{brief.bestFit}</p>
          </div>

          {risks.length > 0 && (
            <div className="mt-4">
              <p className="lf-dataprint text-lot-stone">
                Items to verify
              </p>
              <div className="mt-2 divide-y divide-lot-line border-y border-lot-line">
                {risks.map((risk) => (
                  <div key={`${risk.label}-${risk.level}`} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-lot-ink">{risk.label}</span>
                      <span
                        className={`rounded-none border px-2 py-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.08em] ${REPORT_RISK_TONE[risk.level]}`}
                      >
                        {risk.level}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-lot-stone">{risk.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-lot-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="lf-dataprint text-lot-orange-ink">
                Typical approval path
              </p>
              <h4 className="mt-1 text-sm font-semibold text-lot-ink">
                {brief.permitTrack.name}
              </h4>
            </div>
            <span className="rounded-none border border-lot-line bg-lot-surface px-2 py-1 lf-dataprint text-lot-stone">
              {brief.permitTrack.type}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-lot-stone">{brief.permitTrack.basis}</p>

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
                      className="absolute bottom-0 left-[11px] top-6 w-px bg-lot-line"
                    />
                  )}
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-lot-line bg-lot-chalk font-sans text-[9px] text-lot-stone">
                    {index + 1}
                  </span>
                  <div className="min-w-0 border-b border-lot-line pb-3 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold leading-5 text-lot-ink">
                        {stage.name}
                      </span>
                      <span className="shrink-0 font-sans text-[9px] text-lot-stone">
                        {stage.estWeeksLow}&ndash;{stage.estWeeksHigh} WK
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-lot-stone">{stage.description}</p>
                    <span
                      className={`mt-1.5 block font-sans text-[9px] font-semibold uppercase tracking-[0.08em] ${tone.className}`}
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
        <div className="mt-6 border-t border-lot-line pt-5">
          <p className="lf-dataprint text-lot-orange-ink">
            Recorded next steps
          </p>
          <ol className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {nextSteps.map((step, index) => (
              <li key={`${index}-${step}`} className="grid grid-cols-[20px_1fr] gap-2 text-xs leading-5 text-lot-stone">
                <span className="font-sans text-[9px] text-lot-stone">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-5 border-t border-lot-line pt-4 text-[11px] leading-5 text-lot-stone">
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
  /** Money is carbon and set by weight (design-system §2.6); status tones follow §2.5. */
  tone?: "default" | "money" | "clear" | "review" | "blocked";
}) {
  const toneClass =
    tone === "money"
      ? "text-lot-ink font-semibold tabular-nums"
      : tone === "clear"
        ? "text-status-eligible font-semibold"
        : tone === "review"
          ? "text-status-review font-semibold"
          : tone === "blocked"
            ? "text-status-blocked font-semibold"
            : "text-lot-stone";
  const iconClass =
    tone === "money"
      ? "text-lot-ink"
      : tone === "clear"
      ? "text-status-eligible"
      : tone === "review"
        ? "text-status-review"
        : tone === "blocked"
          ? "text-status-blocked"
          : "text-lot-stone";

  return (
    <div className={`flex items-center gap-2 ${toneClass}`}>
      <Icon size={16} className={`shrink-0 ${iconClass}`} />
      {text}
    </div>
  );
}
