"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  finishLabels,
  formatCurrency,
  getParcelById,
  parcelPresets,
  roofLabels,
  type ADUConfig,
  type FinancialAssumptions,
} from "@/lib/feasibility";
import AppShell from "./studio/AppShell";
import ControlBadge from "./studio/ControlBadge";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[460px] bg-[#16251f]" />,
});

export default function FeasibilityStudio() {
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    defaultFinancialAssumptions,
  );
  const [reportOpen, setReportOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("studio");
  const [reportAutoFocus, setReportAutoFocus] = useState(false);

  const parcel = getParcelById(parcelId);
  const result = useMemo(
    () => calculateFeasibility(parcel, config, assumptions),
    [assumptions, config, parcel],
  );
  const isCompliant = result.zoningStatus === "Compliant";

  function resetScenario() {
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(true);
    setActiveNav("studio");
    setReportAutoFocus(false);
  }

  function handleNavigate(id: string) {
    setActiveNav(id);
    if (id === "export") {
      setReportOpen(true);
    }
  }

  function handleGenerateReport() {
    setReportOpen(true);
    setReportAutoFocus(true);
  }

  function downloadReport() {
    const lines = [
      "UrbanLens AR - Concept Feasibility Report",
      `${parcel.address}, ${parcel.city}`,
      "",
      `ADU concept: ${result.aduSqft.toLocaleString()} sf, ${roofLabels[config.roof]} roof, ${finishLabels[config.finish]} finish`,
      `Lot coverage: ${result.coveragePercent.toFixed(1)}% of ${result.maxCoveragePercent}% max`,
      `Zoning status: ${result.zoningStatus}`,
      `Estimated build cost: ${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`,
      `Monthly rent estimate: ${formatCurrency(result.monthlyRent)}`,
      `Annual NOI estimate: ${formatCurrency(result.annualNoi)}`,
      `Simple payback: ${result.paybackYears} years`,
      "",
      "Investor-demo estimate only. Verify zoning, costs, financing, taxes, and rent assumptions before decisions.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "urbanlens-concept-feasibility-report.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell
      activeNav={activeNav}
      parcelAddress={parcel.address}
      parcelCity={parcel.city}
      onNavigate={handleNavigate}
      onReset={resetScenario}
    >
      <div className="flex min-h-screen flex-col lg:min-h-0 lg:h-[calc(100vh-320px)] xl:flex-row">
        <section
          aria-label="Parcel massing scene"
          className="relative min-h-[520px] flex-1 overflow-hidden border-b border-slate-200 xl:border-b-0 xl:border-r"
        >
          <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
            <ControlBadge label="View" value="Aerial" />
            <ControlBadge label="Sun" value="3:00 PM" />
            <ControlBadge label="Layers" value="Setbacks" />
          </div>
          <ParcelScene parcel={parcel} config={config} isCompliant={isCompliant} />
        </section>

        <FeasibilityInspector
          parcelId={parcelId}
          config={config}
          assumptions={assumptions}
          result={result}
          onParcelChange={setParcelId}
          onConfigChange={setConfig}
          onAssumptionsChange={setAssumptions}
          onReset={resetScenario}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <MetricsSummary result={result} />
      {reportOpen && (
        <ReportPreview
          parcelName={`${parcel.address}, ${parcel.city}`}
          result={result}
          onClose={() => setReportOpen(false)}
          onDownload={downloadReport}
          autoFocus={reportAutoFocus}
        />
      )}
    </AppShell>
  );
}
