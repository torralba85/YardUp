"use client";

import dynamic from "next/dynamic";
import {
  BarChart3,
  Bookmark,
  Box,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Home,
  Layers3,
  Printer,
  RefreshCcw,
  Ruler,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  finishColors,
  finishLabels,
  footprintOptions,
  formatCompactCurrency,
  formatCurrency,
  getParcelById,
  parcelPresets,
  roofLabels,
  type ADUConfig,
  type FinancialAssumptions,
  type RentScenario,
} from "@/lib/feasibility";

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[460px] bg-[#16251f]" />,
});

const navItems = [
  { id: "studio", label: "Feasibility Studio", icon: Box },
  { id: "parcel", label: "Parcel Assumptions", icon: FileText },
  { id: "summary", label: "Estimate Summary", icon: BarChart3 },
  { id: "export", label: "Export Preview", icon: Share2 },
];

const rentLabels: Record<RentScenario, string> = {
  conservative: "Conservative",
  market: "Market",
  optimistic: "Optimistic",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function FeasibilityStudio() {
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(defaultFinancialAssumptions);
  const [reportOpen, setReportOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("studio");

  const parcel = getParcelById(parcelId);
  const result = useMemo(() => calculateFeasibility(parcel, config, assumptions), [assumptions, config, parcel]);
  const isCompliant = result.zoningStatus === "Compliant";
  const selectedOption = footprintOptions.find((item) => item.value === config.footprint) ?? footprintOptions[1];

  function resetScenario() {
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(true);
    setActiveNav("studio");
  }

  function updateRentScenario(rentScenario: RentScenario) {
    setAssumptions((current) => ({ ...current, rentScenario }));
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
    <div className="flex min-h-screen bg-[#07111a] text-slate-900">
      <aside className="hidden w-[238px] shrink-0 flex-col border-r border-white/10 bg-[#07111a] text-white lg:flex">
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-400/10 text-emerald-300">
              <Home size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">UrbanLens AR</h1>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">ADU Feasibility Visualizer</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.id === "export") {
                      setReportOpen(true);
                    }
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                    isActive ? "bg-emerald-500/20 text-white ring-1 ring-emerald-400/15" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-emerald-300" : "text-slate-400"} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex gap-3">
                <div className="h-14 w-14 rounded bg-gradient-to-br from-emerald-200 to-slate-500" />
                <div>
                  <div className="text-sm font-semibold">{parcel.address}</div>
                  <div className="mt-1 text-xs text-slate-400">{parcel.city}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetScenario}
                className="mt-3 h-9 w-full rounded border border-white/10 text-xs font-medium text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
              >
                Reset Project
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-md px-2 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">MC</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">M. Carter</div>
                <div className="text-xs text-slate-400">Investor Demo</div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#f5f7f4] lg:h-screen lg:overflow-hidden">
        <div className="flex min-h-screen flex-col lg:min-h-0 lg:h-[calc(100vh-320px)] xl:flex-row">
          <section className="relative min-h-[520px] flex-1 overflow-hidden border-b border-slate-200 xl:border-b-0 xl:border-r">
            <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <ControlBadge label="View" value="Aerial" />
              <ControlBadge label="Sun" value="3:00 PM" />
              <ControlBadge label="Layers" value="Setbacks" />
            </div>
            <ParcelScene parcel={parcel} config={config} isCompliant={isCompliant} />
          </section>

          <section className="w-full shrink-0 bg-white xl:w-[404px]">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Feasibility</h2>
                  <p className="mt-1 text-sm text-slate-500">Live concept assumptions and investor-grade outputs.</p>
                </div>
                <button
                  type="button"
                  onClick={resetScenario}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <RefreshCcw size={15} />
                  Reset
                </button>
              </div>

              <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
                <div className="space-y-3" id="parcel">
                  <LabelRow label="Parcel Preset" />
                  <select
                    value={parcelId}
                    onChange={(event) => setParcelId(event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                  >
                    {parcelPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.lotArea.toLocaleString()} sf)
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Fact label="Lot Area" value={`${parcel.lotArea.toLocaleString()} sf`} />
                    <Fact label="Lot Dimensions" value={`${parcel.lotWidth}' x ${parcel.lotLength}'`} />
                    <Fact label="Existing Footprint" value={`${parcel.existingHouseSqft.toLocaleString()} sf`} />
                    <Fact label="Max Coverage" value={`${parcel.maxLotCoveragePercent}%`} />
                  </div>
                </div>

                <div className="space-y-3">
                  <LabelRow label="ADU Size" value="Footprint" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                    {footprintOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setConfig((current) => configForFootprint(option.value, current))}
                        className={`h-10 rounded-md border text-sm font-semibold transition ${
                          config.footprint === option.value
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Selected: {selectedOption.label} ({selectedOption.summary})
                  </p>
                </div>

                <div className="space-y-4">
                  <LabelRow label="Fine Tune Dimensions" />
                  <Slider
                    label="Width"
                    value={config.width}
                    min={16}
                    max={32}
                    suffix="ft"
                    onChange={(value) => setConfig((current) => ({ ...current, width: value, footprint: value * current.length }))}
                  />
                  <Slider
                    label="Length"
                    value={config.length}
                    min={20}
                    max={44}
                    suffix="ft"
                    onChange={(value) => setConfig((current) => ({ ...current, length: value, footprint: current.width * value }))}
                  />
                </div>

                <div className="space-y-3">
                  <LabelRow label="Roof Style" />
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(roofLabels).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setConfig((current) => ({ ...current, roof: key as ADUConfig["roof"] }))}
                        className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-xs font-semibold transition ${
                          config.roof === key ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <Building2 size={22} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <LabelRow label="Exterior Finish" />
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(finishLabels).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setConfig((current) => ({ ...current, finish: key as ADUConfig["finish"] }))}
                        className={`rounded-md border p-2 text-left text-xs font-semibold transition ${
                          config.finish === key ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        <span className="mb-2 block h-8 rounded-sm" style={{ background: finishColors[key as ADUConfig["finish"]] }} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <LabelRow label="Rental Estimate" value={formatCurrency(result.monthlyRent)} />
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(rentLabels) as RentScenario[]).map((scenario) => (
                      <button
                        key={scenario}
                        type="button"
                        onClick={() => updateRentScenario(scenario)}
                        className={`h-10 rounded-md border text-xs font-semibold transition ${
                          assumptions.rentScenario === scenario
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {rentLabels[scenario]}
                      </button>
                    ))}
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 shrink-0" size={17} />
                      <div>
                        <div className="font-semibold">Review needed</div>
                        <p className="mt-1 text-xs leading-5">{result.warnings[0]}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <Sparkles size={17} />
                  Generate Concept Report
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((current) => ({ ...current, includeOpenings: !current.includeOpenings }))}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <Bookmark size={16} />
                  {config.includeOpenings ? "Remove Openings" : "Add Entry / Windows"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <MetricsSummary result={result} />
        {reportOpen && (
          <ReportPreview
            parcelName={`${parcel.address}, ${parcel.city}`}
            result={result}
            onClose={() => setReportOpen(false)}
            onDownload={downloadReport}
          />
        )}
      </main>
    </div>
  );
}

function ControlBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
      <span className="mr-2 text-slate-500">{label}</span>
      {value}
    </div>
  );
}

function LabelRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
      {value && <span className="text-sm font-semibold text-emerald-700">{value}</span>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 font-medium text-slate-800">{value}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        {label}
        <span className="font-mono text-slate-800">
          {value} {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="w-full accent-emerald-700"
      />
    </label>
  );
}

function MetricsSummary({ result }: { result: ReturnType<typeof calculateFeasibility> }) {
  const metrics = [
    {
      icon: Ruler,
      label: "Build Cost Range",
      value: `${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`,
      detail: `$${result.costPerSqftLow} - $${result.costPerSqftHigh} / sf`,
    },
    { icon: Home, label: "Monthly Rent", value: formatCurrency(result.monthlyRent), detail: "Local demo estimate" },
    { icon: BarChart3, label: "Annual NOI", value: formatCurrency(result.annualNoi), detail: "After OpEx & vacancy" },
    { icon: SlidersHorizontal, label: "Payback", value: `${result.paybackYears}`, detail: "Years at mid-range cost" },
    {
      icon: Layers3,
      label: "Coverage Used",
      value: `${Math.round(result.coveragePercent)}%`,
      detail: `${result.totalFootprint.toLocaleString()} sf / ${result.allowedFootprint.toLocaleString()} sf allowed`,
    },
    { icon: CheckCircle2, label: "Zoning Status", value: result.zoningStatus, detail: result.zoningStatus === "Compliant" ? "ADU appears allowed" : "Needs review" },
  ];

  return (
    <section id="summary" className="grid border-t border-slate-200 bg-white lg:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="border-b border-slate-200 px-6 py-5 lg:border-b-0 lg:border-r last:lg:border-r-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Icon size={15} />
              {metric.label}
            </div>
            <div className={`mt-2 text-2xl font-semibold tracking-tight ${metric.label === "Zoning Status" ? "text-emerald-700" : "text-slate-950"}`}>
              {metric.value}
            </div>
            <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>
          </div>
        );
      })}
    </section>
  );
}

function ReportPreview({
  parcelName,
  result,
  onClose,
  onDownload,
}: {
  parcelName: string;
  result: ReturnType<typeof calculateFeasibility>;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <section id="export" className="border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-18px_40px_rgba(15,23,42,0.08)] print:shadow-none lg:h-[202px] lg:overflow-hidden">
      <div className="grid gap-6 lg:grid-cols-[150px_1fr_1fr_250px]">
        <div className="hidden rounded-md border border-slate-200 bg-slate-50 p-3 lg:block">
          <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-800">UrbanLens AR</div>
          <div className="mt-3 aspect-[4/5] rounded bg-gradient-to-br from-emerald-100 via-slate-200 to-slate-500" />
          <div className="mt-3 text-xs font-semibold text-slate-900">Concept Feasibility Report</div>
          <div className="mt-1 text-[11px] text-slate-500">{parcelName}</div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Concept Feasibility Report</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            A shareable investor-demo summary of the selected ADU concept, site assumptions, estimated costs, rental upside, and zoning feasibility.
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <ReportFact icon={FileText} text={`${result.aduSqft.toLocaleString()} sf ADU concept`} />
            <ReportFact icon={Ruler} text={`${result.coveragePercent.toFixed(1)}% projected lot coverage`} />
            <ReportFact icon={BarChart3} text={`${formatCurrency(result.annualNoi)} annual NOI estimate`} />
            <ReportFact icon={CheckCircle2} text={`${result.zoningStatus} feasibility status`} />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h3 className="text-sm font-semibold text-slate-900">Report Includes</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            {["Project overview", "Cost estimate range", "Site plan & 3D view", "Rental analysis", "Assumptions", "Zoning & compliance", "Feasibility metrics", "Next steps"].map((item) => (
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
            <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <span className="sr-only">Close report preview</span>
              x
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Download Summary
          </button>
          <div className="rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Estimate only. Confirm local zoning, utility constraints, financing, tax treatment, and market rents before investment decisions.
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportFact({ icon: Icon, text }: { icon: typeof FileText; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-slate-500" />
      {text}
    </div>
  );
}
