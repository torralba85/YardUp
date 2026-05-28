"use client";

import { useEffect, useRef } from "react";
import { BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText, Printer, Ruler, Share2 } from "lucide-react";
import { formatCurrency } from "@/lib/feasibility";
import type { FeasibilityResult } from "./types";

export interface ReportPreviewProps {
  parcelName: string;
  result: FeasibilityResult;
  onClose: () => void;
  onDownload: () => void;
  onExportCsv?: () => void;
  onShare?: () => void;
  shareNotice?: string | null;
  autoFocus?: boolean;
}

export default function ReportPreview({
  parcelName,
  result,
  onClose,
  onDownload,
  onExportCsv,
  onShare,
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
      className="border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-18px_40px_rgba(15,23,42,0.08)] print:shadow-none lg:h-[202px] lg:overflow-hidden"
    >
      <div className="grid gap-6 lg:grid-cols-[150px_1fr_1fr_250px]">
        <div className="hidden rounded-md border border-slate-200 bg-slate-50 p-3 lg:block">
          <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800">
            UrbanLens AR
          </div>
          <div className="mt-3 aspect-[4/5] rounded bg-gradient-to-br from-emerald-100 via-slate-200 to-slate-500" />
          <div className="mt-3 text-xs font-semibold text-slate-900">
            Concept Feasibility Report
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{parcelName}</div>
        </div>

        <div>
          <h2
            id="report-preview-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight text-slate-950 focus:outline-none"
          >
            Concept Feasibility Report
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            A shareable investor-demo summary of the selected ADU concept, site assumptions,
            estimated costs, rental upside, and zoning feasibility.
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <ReportFact icon={FileText} text={`${result.aduSqft.toLocaleString()} sf ADU concept`} />
            <ReportFact
              icon={Ruler}
              text={`${result.coveragePercent.toFixed(1)}% projected lot coverage`}
            />
            <ReportFact
              icon={BarChart3}
              text={`${formatCurrency(result.annualNoi)} annual NOI estimate`}
            />
            <ReportFact icon={CheckCircle2} text={`${result.zoningStatus} feasibility status`} />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h3 className="text-sm font-semibold text-slate-900">Report Includes</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
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
                <CheckCircle2 size={16} className="text-emerald-700" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Share or Export</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report preview"
              className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Download size={16} />
            Download Summary
          </button>
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <Share2 size={16} />
              {shareNotice ?? "Share Link"}
            </button>
          )}
          <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Estimate only. Confirm local zoning, utility constraints, financing, tax treatment,
            and market rents before investment decisions.
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
      <Icon size={16} className="text-slate-500" />
      {text}
    </div>
  );
}
