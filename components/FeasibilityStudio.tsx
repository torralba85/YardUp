"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CircleCheck, Clock3, Hammer } from "lucide-react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  formatCompactCurrency,
  formatCurrency,
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
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";
import type { FeasibilityResult } from "./studio/types";

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
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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

  // Deliberate post-hydration sync from URL: server renders defaults so the
  // static HTML matches first client paint; we then apply URL state once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const parsed = parseScenarioParams(params);
    if (parsed.parcelId) setParcelId(parsed.parcelId);
    if (parsed.config) setConfig(parsed.config);
    if (parsed.assumptions) setAssumptions(parsed.assumptions);
    setHydratedFromUrl(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydratedFromUrl || typeof window === "undefined") return;
    const serialized = serializeScenarioParams({ parcelId, config, assumptions });
    const next = `${window.location.pathname}?${serialized}`;
    window.history.replaceState(null, "", next);
  }, [assumptions, config, hydratedFromUrl, parcelId]);

  function resetScenario() {
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(false);
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
      <div
        className={`flex min-h-screen flex-col lg:min-h-0 ${
          reportOpen ? "lg:h-[calc(100vh-320px)]" : "lg:h-[calc(100vh-118px)]"
        } xl:flex-row`}
      >
        <section
          aria-label="Parcel massing scene"
          className="relative min-h-[540px] flex-1 overflow-hidden border-b border-slate-200 bg-[#13221c] xl:border-b-0 xl:border-r"
        >
          <IncomeLens result={result} isCompliant={isCompliant} />
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

function IncomeLens({
  result,
  isCompliant,
}: {
  result: FeasibilityResult;
  isCompliant: boolean;
}) {
  return (
    <div className="pointer-events-none absolute left-4 right-4 top-4 z-30 max-w-[760px] rounded-md border border-white/20 bg-slate-950/[0.78] p-4 text-white shadow-2xl backdrop-blur-md sm:left-5 sm:right-auto sm:min-w-[520px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
            ADU income potential
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {formatCurrency(result.monthlyRent)}
            <span className="ml-2 text-base font-medium text-slate-300">/ mo rent</span>
          </h2>
        </div>
        <div
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            isCompliant
              ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
              : "border-amber-300/50 bg-amber-300/15 text-amber-100"
          }`}
        >
          {result.zoningStatus}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <LensFact
          icon={BadgeDollarSign}
          label="Annual NOI"
          value={formatCurrency(result.annualNoi)}
        />
        <LensFact icon={Clock3} label="Payback" value={`${result.paybackYears} yrs`} />
        <LensFact
          icon={Hammer}
          label="Build range"
          value={`${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`}
        />
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-300">
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-emerald-200" />
        Estimate updates as you change parcel, size, finish, and rent assumptions.
      </div>
    </div>
  );
}

function LensFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.08] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}
