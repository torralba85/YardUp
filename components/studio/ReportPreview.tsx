"use client";

import { useEffect, useRef } from "react";
import { BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText, Hammer, Printer, Ruler, Share2, X } from "lucide-react";
import { formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";

/** Props for {@link ReportPreview}. */
export interface ReportPreviewProps {
  /** Display name of the parcel shown in the report header. */
  parcelName: string;
  /** The feasibility result rendered into the report. */
  result: FeasibilityResult;
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
      className="border-t border-lf-hairline bg-lf-card px-6 py-4 shadow-[0_-18px_40px_rgba(38,19,7,0.05)] print:shadow-none max-h-[70dvh] overflow-y-auto lg:max-h-[40vh]"
    >
      <div className="grid gap-6 lg:grid-cols-[140px_1fr_1fr_220px] xl:grid-cols-[150px_1fr_1fr_250px]">
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
            income ledger, and payback — typeset as a document you can print, share,
            or bring to a builder. Final scope and approvals still require local review.
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
        </div>

        <div className="border-t border-lf-hairline pt-5 lg:border-l lg:border-lf-hairline lg:border-t-0 lg:pl-7 lg:pt-0">
          <h3 className="text-sm font-semibold text-lf-espresso">Report Includes</h3>
          <div className="mt-4 grid gap-3 text-sm text-lf-muted sm:grid-cols-2">
            {[
              "Project overview",
              "Cost estimate range",
              "Site plan & 3D view",
              "Rental analysis",
              "Assumptions",
              "Zoning & compliance",
              "Feasibility metrics",
              "Next steps",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-lf-mahogany" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 border-t border-lf-hairline pt-5 lg:border-l lg:border-lf-hairline lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-lf-espresso">Share or Export</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded p-1 text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-lf-mahogany text-xs font-semibold text-lf-sand-2 transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <Printer size={14} />
              Print / Save
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-lf-hairline text-xs font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
            >
              <Download size={14} />
              Download
            </button>
            {onExportCsv && (
              <button
                type="button"
                onClick={onExportCsv}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-lf-hairline text-xs font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
              >
                <FileSpreadsheet size={14} />
                CSV Export
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-lf-hairline text-xs font-semibold text-lf-muted transition hover:border-lf-taupe hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
              >
                <Share2 size={14} />
                <span className="truncate">{shareNotice ?? "Share Link"}</span>
              </button>
            )}
            {onConnectBuilders && (
              <button
                type="button"
                onClick={onConnectBuilders}
                className="col-span-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-lf-mahogany text-xs font-semibold text-lf-sand-2 transition hover:bg-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
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
    </section>
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
