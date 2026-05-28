"use client";

import { Bookmark, BookmarkPlus, Building2, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import {
  configForFootprint,
  finishColors,
  finishLabels,
  footprintOptions,
  formatCurrency,
  parcelPresets,
  roofLabels,
} from "@/lib/feasibility";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
  RentScenario,
} from "./types";

const rentLabels: Record<RentScenario, string> = {
  conservative: "Conservative",
  market: "Market",
  optimistic: "Optimistic",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export interface FeasibilityInspectorProps {
  parcelId: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  onParcelChange: (parcelId: string) => void;
  onConfigChange: (config: ADUConfig) => void;
  onAssumptionsChange: (assumptions: FinancialAssumptions) => void;
  onReset: () => void;
  onGenerateReport: () => void;
  onSaveScenario?: () => void;
  saveNotice?: string | null;
}

export default function FeasibilityInspector({
  parcelId,
  config,
  assumptions,
  result,
  onParcelChange,
  onConfigChange,
  onAssumptionsChange,
  onReset,
  onGenerateReport,
  onSaveScenario,
  saveNotice,
}: FeasibilityInspectorProps) {
  const parcel = parcelPresets.find((preset) => preset.id === parcelId) ?? parcelPresets[0];
  const selectedOption =
    footprintOptions.find((item) => item.value === config.footprint) ?? footprintOptions[1];

  return (
    <section
      aria-labelledby="feasibility-heading"
      className="w-full shrink-0 bg-white lg:h-full xl:w-[404px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2
              id="feasibility-heading"
              className="text-2xl font-semibold tracking-tight text-slate-950"
            >
              Feasibility Studio
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live concept assumptions and investor-grade outputs.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <RefreshCcw size={15} />
            Reset
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <div className="space-y-3" id="parcel">
            <LabelRow label="Parcel Preset" />
            <label className="sr-only" htmlFor="parcel-preset">
              Parcel Preset
            </label>
            <select
              id="parcel-preset"
              value={parcelId}
              onChange={(event) => onParcelChange(event.target.value)}
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
              <Fact
                label="Existing Footprint"
                value={`${parcel.existingHouseSqft.toLocaleString()} sf`}
              />
              <Fact label="Max Coverage" value={`${parcel.maxLotCoveragePercent}%`} />
            </div>
          </div>

          <div className="space-y-3">
            <LabelRow label="ADU Size" value="Footprint" valueClass="font-sans text-slate-500 font-medium" />
            <div
              role="group"
              aria-label="ADU footprint size"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4"
            >
              {footprintOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onConfigChange(configForFootprint(option.value, config))}
                  aria-pressed={config.footprint === option.value}
                  className={`h-10 rounded-md border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
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
              onChange={(value) =>
                onConfigChange({
                  ...config,
                  width: value,
                  footprint: value * config.length,
                })
              }
            />
            <Slider
              label="Length"
              value={config.length}
              min={20}
              max={44}
              suffix="ft"
              onChange={(value) =>
                onConfigChange({
                  ...config,
                  length: value,
                  footprint: config.width * value,
                })
              }
            />
          </div>

          <div className="space-y-3">
            <LabelRow label="Roof Style" />
            <div role="group" aria-label="Roof style" className="grid grid-cols-3 gap-3">
              {Object.entries(roofLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onConfigChange({ ...config, roof: key as ADUConfig["roof"] })}
                  aria-pressed={config.roof === key}
                  className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                    config.roof === key
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
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
            <div role="group" aria-label="Exterior finish" className="grid grid-cols-2 gap-3">
              {Object.entries(finishLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onConfigChange({ ...config, finish: key as ADUConfig["finish"] })
                  }
                  aria-pressed={config.finish === key}
                  className={`rounded-md border p-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                    config.finish === key
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  <span
                    className="mb-2 block h-8 rounded-sm"
                    style={{ background: finishColors[key as ADUConfig["finish"]] }}
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <LabelRow label="Rental Estimate" value={formatCurrency(result.monthlyRent)} />
            <div role="group" aria-label="Rental estimate" className="grid grid-cols-3 gap-2">
              {(Object.keys(rentLabels) as RentScenario[]).map((scenario) => (
                <button
                  key={scenario}
                  type="button"
                  onClick={() =>
                    onAssumptionsChange({ ...assumptions, rentScenario: scenario })
                  }
                  aria-pressed={assumptions.rentScenario === scenario}
                  className={`h-10 rounded-md border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
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
            <div
              role="alert"
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
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
            onClick={onGenerateReport}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Sparkles size={17} />
            Generate Concept Report
          </button>
          {onSaveScenario && (
            <button
              type="button"
              onClick={onSaveScenario}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <BookmarkPlus size={16} />
              {saveNotice ?? "Save Concept"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              onConfigChange({ ...config, includeOpenings: !config.includeOpenings })
            }
            aria-pressed={config.includeOpenings}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Bookmark size={16} />
            {config.includeOpenings ? "Remove Openings" : "Add Entry / Windows"}
          </button>
        </div>
      </div>
    </section>
  );
}

function LabelRow({
  label,
  value,
  valueClass = "font-serif text-emerald-700",
}: {
  label: string;
  value?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
      {value && <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-medium text-slate-800">{value}</div>
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
  const inputId = `slider-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        {label}
        <span className="font-mono text-slate-800">
          {value} {suffix}
        </span>
      </span>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="w-full accent-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      />
    </label>
  );
}
