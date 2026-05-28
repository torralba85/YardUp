"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type FinancialAssumptions,
} from "@/lib/feasibility";
import { buildReportCsv, buildReportText, downloadBlob } from "@/lib/report";
import {
  parseScenarioParams,
  serializeScenarioParams,
} from "@/lib/scenario-url";
import {
  createSavedScenarioStore,
  type SavedScenario,
} from "@/lib/saved-scenarios";
import AppShell from "./studio/AppShell";
import ControlBadge from "./studio/ControlBadge";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[460px] bg-[#16251f]" />,
});

function readInitialScenarioFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return parseScenarioParams(params);
}

export default function FeasibilityStudio() {
  const [parcelId, setParcelId] = useState(
    () => readInitialScenarioFromUrl()?.parcelId ?? parcelPresets[0].id,
  );
  const [config, setConfig] = useState<ADUConfig>(
    () => readInitialScenarioFromUrl()?.config ?? defaultAduConfig,
  );
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    () => readInitialScenarioFromUrl()?.assumptions ?? defaultFinancialAssumptions,
  );
  const [reportOpen, setReportOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("studio");
  const [reportAutoFocus, setReportAutoFocus] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    if (typeof window === "undefined") return [];
    return createSavedScenarioStore(window.localStorage).list();
  });

  const parcel = getParcelById(parcelId);
  const result = useMemo(
    () => calculateFeasibility(parcel, config, assumptions),
    [assumptions, config, parcel],
  );
  const isCompliant = result.zoningStatus === "Compliant";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const serialized = serializeScenarioParams({ parcelId, config, assumptions });
    const next = `${window.location.pathname}?${serialized}`;
    window.history.replaceState(null, "", next);
  }, [assumptions, config, parcelId]);

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

  function handleSaveScenario() {
    if (typeof window === "undefined") return;
    const store = createSavedScenarioStore(window.localStorage);
    const created = store.save({
      name: `${parcel.address} - ${config.footprint} sf`,
      parcelId,
      config,
      assumptions,
    });
    setSavedScenarios(store.list());
    setSaveNotice("Saved");
    setTimeout(() => setSaveNotice(null), 2000);
    return created;
  }

  function handleLoadScenario(id: string) {
    if (typeof window === "undefined") return;
    const store = createSavedScenarioStore(window.localStorage);
    const scenario = store.load(id);
    if (!scenario) return;
    setParcelId(scenario.parcelId);
    setConfig(scenario.config);
    setAssumptions(scenario.assumptions);
  }

  function handleDeleteScenario(id: string) {
    if (typeof window === "undefined") return;
    const store = createSavedScenarioStore(window.localStorage);
    store.remove(id);
    setSavedScenarios(store.list());
  }

  async function handleShareLink() {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setShareNotice("Link copied");
    } catch {
      setShareNotice(href);
    }
    setTimeout(() => setShareNotice(null), 2500);
  }

  function downloadReport() {
    const text = buildReportText({ parcel, config, result });
    downloadBlob("urbanlens-concept-feasibility-report.txt", text, "text/plain");
  }

  function exportCsv() {
    const csv = buildReportCsv({ parcel, config, result });
    downloadBlob("urbanlens-concept-feasibility-report.csv", csv, "text/csv");
  }

  return (
    <AppShell
      activeNav={activeNav}
      parcelAddress={parcel.address}
      parcelCity={parcel.city}
      onNavigate={handleNavigate}
      onReset={resetScenario}
      savedScenarios={savedScenarios}
      onLoadScenario={handleLoadScenario}
      onDeleteScenario={handleDeleteScenario}
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
          onSaveScenario={handleSaveScenario}
          saveNotice={saveNotice}
        />
      </div>

      <MetricsSummary result={result} />
      {reportOpen && (
        <ReportPreview
          parcelName={`${parcel.address}, ${parcel.city}`}
          result={result}
          onClose={() => setReportOpen(false)}
          onDownload={downloadReport}
          onExportCsv={exportCsv}
          onShare={handleShareLink}
          shareNotice={shareNotice}
          autoFocus={reportAutoFocus}
        />
      )}
    </AppShell>
  );
}
