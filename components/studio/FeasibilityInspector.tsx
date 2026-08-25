"use client";

import { Bookmark, BookmarkPlus, Building2, Check, ChevronDown, MapPin, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  configForFootprint,
  finishColors,
  finishLabels,
  footprintOptions,
  formatCurrency,
  parcelPresets,
  roofLabels,
} from "@/lib/feasibility";
import { useParcel } from "@/lib/parcel-context";
import { Button } from "@/components/ui/Button";
import AddressSearch, { type AddressSearchResult } from "./AddressSearch";
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

const journeySteps = [
  {
    step: 1,
    title: "Property",
    description: "Confirm the address or sample parcel.",
  },
  {
    step: 2,
    title: "ADU fit",
    description: "Shape the unit and watch the lot update.",
  },
  {
    step: 3,
    title: "Money model",
    description: "Check rent, payback, and review flags.",
  },
] as const;

const nextActionByStep = {
  1: "Search an address or keep the sample lot, then move to ADU fit.",
  2: "Pick a footprint and finish that still works on the parcel.",
  3: "Choose the rent scenario you trust, then create the report.",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Props for {@link FeasibilityInspector}. */
export interface FeasibilityInspectorProps {
  /** Id of the active parcel preset. */
  parcelId: string;
  /** Current ADU design configuration. */
  config: ADUConfig;
  /** Current financial assumptions. */
  assumptions: FinancialAssumptions;
  /** Computed feasibility result for the current inputs. */
  result: FeasibilityResult;
  /** Called when the user selects a different parcel preset. */
  onParcelChange: (parcelId: string) => void;
  /** Called when the ADU configuration changes. */
  onConfigChange: (config: ADUConfig) => void;
  /** Called when the financial assumptions change. */
  onAssumptionsChange: (assumptions: FinancialAssumptions) => void;
  /** Called to reset the inspector to defaults. */
  onReset: () => void;
  /** Called to generate the feasibility report. */
  onGenerateReport: () => void;
  /** Optional handler to save the current scenario. */
  onSaveScenario?: () => Promise<void> | void;
  /** Whether a save is in progress (disables the control). */
  savingScenario?: boolean;
  /** Transient status message shown after a save attempt. */
  saveNotice?: string | null;
}

/**
 * The main left-hand inspector: address/parcel selection, ADU design controls
 * (footprint, roof, finish, openings), financial assumption dials, and the
 * actions to reset, save a scenario, and generate the report. Reads and mutates
 * parcel state via {@link useParcel} and surfaces the guided journey steps.
 *
 * @param props - The {@link FeasibilityInspectorProps}.
 */
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
  savingScenario = false,
  saveNotice,
}: FeasibilityInspectorProps) {
  const { parcel, parcelMode, parcelLoading, parcelError, searchParcel, searchByAddress, resetToPreset } = useParcel();
  const [openStep, setOpenStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const presetParcel = parcelPresets.find((p) => p.id === parcelId) ?? parcelPresets[0];
  const displayParcel = parcelMode === "live" ? parcel : presetParcel;

  const selectedOption = footprintOptions.find(
    (item) =>
      item.value === config.footprint &&
      item.width === config.width &&
      item.length === config.length
  );

  function handleAddressSelect(result: AddressSearchResult) {
    searchParcel(result.lat, result.lng, result.formattedAddress);
  }

  function handleAddressText(query: string) {
    searchByAddress(query);
  }

  function handleResetToPreset() {
    resetToPreset(presetParcel);
    handleReset();
  }

  function handleReset() {
    setOpenStep(1);
    setCompletedSteps(new Set());
    onReset();
  }

  function toggleStep(step: 1 | 2 | 3) {
    if (openStep === step) return;
    setOpenStep(step);
  }

  function completeStep(step: 1 | 2 | 3) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }

  function handleNextStep(currentStep: 1 | 2, nextStep: 2 | 3) {
    completeStep(currentStep);
    toggleStep(nextStep);
  }

  function handleGenerateReportClick() {
    completeStep(3);
    onGenerateReport();
  }

  return (
    <section
      aria-labelledby="feasibility-heading"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-y-auto lg:w-[404px] lg:border-l"
    >
      <div className="flex min-h-full flex-col">

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-lf-hairline px-6 py-5">
          <div>
            <h2
              id="feasibility-heading"
              className="text-2xl font-semibold tracking-tight text-lf-espresso"
            >
              Feasibility Studio
            </h2>
            <p className="mt-1 text-sm text-lf-muted">
              Confirm the lot, shape the ADU, then test the income case.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2"
          >
            <RefreshCcw size={15} />
            Reset
          </button>
        </div>

        <JourneyProgress activeStep={openStep} completedSteps={completedSteps} />

        {/* Accordion steps */}
        <div className="flex-1 divide-y divide-lf-hairline">

          {/* Step 1 — Your Property */}
          <AccordionStep
            step={1}
            title="Your Property"
            isOpen={openStep === 1}
            isComplete={completedSteps.has(1) && openStep !== 1}
            onToggle={() => toggleStep(1)}
          >
            <div className="space-y-4">
              {parcelMode === "live" ? (
                <>
                  <div className="flex items-center justify-between">
                    <LabelRow label="Property" />
                    <button
                      type="button"
                      onClick={handleResetToPreset}
                      className="relative flex min-h-11 items-center gap-1 text-xs font-medium text-lf-clay-ink transition hover:text-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2 before:absolute before:-inset-x-2 before:-inset-y-3"
                    >
                      <RefreshCcw size={12} />
                      Demo mode
                    </button>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-lf-hairline bg-lf-sand p-3">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-lf-clay-ink" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-lf-espresso">
                        {displayParcel.address}
                      </div>
                      <div className="mt-0.5 text-xs text-lf-muted">{displayParcel.city}</div>
                    </div>
                  </div>

                  {"source" in displayParcel && displayParcel.source === "fallback" && (
                    <div
                      role="note"
                      className="flex items-start gap-2 rounded-lg border border-lf-amber-ink/35 bg-lf-amber-soft p-3 text-xs text-lf-amber-ink"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0 text-lf-amber-ink" />
                      Exact data unavailable for this address — using typical estimates. Double-check with your local planning department.
                    </div>
                  )}

                  {parcelError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs text-lf-brick"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                      {parcelError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <LabelRow label="Sample Property" htmlFor="parcel-preset" />
                  <select
                    id="parcel-preset"
                    value={parcelId}
                    onChange={(event) => onParcelChange(event.target.value)}
                    className="h-11 w-full rounded-lg border border-lf-hairline bg-lf-card px-3 text-sm font-medium text-lf-espresso outline-none transition focus:border-lf-clay focus:ring-2 focus:ring-lf-clay/15"
                  >
                    {parcelPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.lotArea.toLocaleString()} sf)
                      </option>
                    ))}
                  </select>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-lf-muted">Or search your address:</p>
                    <AddressSearch onSelect={handleAddressSelect} onSubmitText={handleAddressText} />
                    {parcelError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs text-lf-brick"
                      >
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                        {parcelError}
                      </div>
                    )}
                  </div>
                </>
              )}

              {parcelLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-lf-hairline bg-lf-sand-2 px-3 py-2 text-xs text-lf-muted">
                  <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
                  Looking up property data…
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Fact label="Lot Area" value={`${displayParcel.lotArea.toLocaleString()} sf`} />
                <Fact label="Lot Dimensions" value={`${displayParcel.lotWidth}' x ${displayParcel.lotLength}'`} />
                <Fact label="Existing Footprint" value={`${displayParcel.existingHouseSqft.toLocaleString()} sf`} />
                <Fact label="Max Coverage" value={`${displayParcel.maxLotCoveragePercent}%`} />
                {"zoning" in displayParcel && (
                  <Fact label="Zoning" value={String((displayParcel as { zoning: string }).zoning)} />
                )}
                <Fact
                  label="Setbacks"
                  value={`${displayParcel.setbacks.front}/${displayParcel.setbacks.side}/${displayParcel.setbacks.rear} ft`}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => handleNextStep(1, 2)}
                rightIcon={<ChevronDown size={15} className="-rotate-90" />}
              >
                Next: Design your ADU
              </Button>
            </div>
          </AccordionStep>

          {/* Step 2 — Design Your ADU */}
          <AccordionStep
            step={2}
            title="Design Your ADU"
            isOpen={openStep === 2}
            isComplete={completedSteps.has(2) && openStep !== 2}
            onToggle={() => toggleStep(2)}
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <LabelRow label="ADU Size" value="Footprint" valueClass="font-sans text-lf-muted font-medium" />
                <div
                  role="group"
                  aria-label="ADU footprint size"
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4"
                >
                  {footprintOptions.map((option) => {
                    const isPressed =
                      config.footprint === option.value &&
                      config.width === option.width &&
                      config.length === option.length;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        size="md"
                        variant={isPressed ? "selected" : "secondary"}
                        onClick={() => onConfigChange(configForFootprint(option.value, config))}
                        aria-pressed={isPressed}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-lf-muted">
                  {selectedOption
                    ? `Selected: ${selectedOption.label} (${selectedOption.summary})`
                    : `Custom size: ${config.footprint.toLocaleString()} sf (${config.width}' x ${config.length}')`}
                </p>
              </div>

              <div className="space-y-4">
                <LabelRow label="Fine-tune dimensions" />
                <Slider
                  label="Width"
                  value={config.width}
                  min={16}
                  max={32}
                  suffix="ft"
                  onChange={(value) =>
                    onConfigChange({ ...config, width: value, footprint: value * config.length })
                  }
                />
                <Slider
                  label="Length"
                  value={config.length}
                  min={20}
                  max={44}
                  suffix="ft"
                  onChange={(value) =>
                    onConfigChange({ ...config, length: value, footprint: config.width * value })
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
                      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2 ${
                        config.roof === key
                          ? "border-lf-clay bg-lf-taupe-soft text-lf-espresso ring-1 ring-lf-clay/20"
                          : "border-lf-hairline bg-lf-card text-lf-muted hover:border-lf-taupe/50 hover:bg-lf-sand-2"
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
                      className={`rounded-lg border p-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2 ${
                        config.finish === key
                          ? "border-lf-clay bg-lf-taupe-soft text-lf-espresso ring-1 ring-lf-clay/20"
                          : "border-lf-hairline bg-lf-card text-lf-muted hover:border-lf-taupe/50 hover:bg-lf-sand-2"
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

              {/* Openings toggle — moved from footer */}
              <Button
                type="button"
                size="md"
                variant={config.includeOpenings ? "selected" : "secondary"}
                fullWidth
                onClick={() => onConfigChange({ ...config, includeOpenings: !config.includeOpenings })}
                aria-pressed={config.includeOpenings}
                leftIcon={<Bookmark size={16} />}
              >
                {config.includeOpenings ? "Remove Entry & Windows" : "Add Entry & Windows"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => handleNextStep(2, 3)}
                rightIcon={<ChevronDown size={15} className="-rotate-90" />}
              >
                Next: Run the numbers
              </Button>
            </div>
          </AccordionStep>

          {/* Step 3 — Run the Numbers */}
          <AccordionStep
            step={3}
            title="Run the Numbers"
            isOpen={openStep === 3}
            isComplete={completedSteps.has(3) && openStep !== 3}
            onToggle={() => toggleStep(3)}
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <LabelRow
                  label="Rental Estimate"
                  value={formatCurrency(result.monthlyRent)}
                  valueClass="font-display text-lf-forest"
                />
                <div role="group" aria-label="Rental estimate" className="grid grid-cols-3 gap-2">
                  {(Object.keys(rentLabels) as RentScenario[]).map((scenario) => (
                    <Button
                      key={scenario}
                      type="button"
                      size="md"
                      variant={assumptions.rentScenario === scenario ? "selected" : "secondary"}
                      onClick={() =>
                        onAssumptionsChange({ ...assumptions, rentScenario: scenario })
                      }
                      aria-pressed={assumptions.rentScenario === scenario}
                      className="text-xs"
                    >
                      {rentLabels[scenario]}
                    </Button>
                  ))}
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-lf-amber-ink/35 bg-lf-amber-soft p-3 text-sm text-lf-amber-ink"
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
          </AccordionStep>

        </div>

        {/* Footer CTAs stay in the panel flow so short desktop viewports can scroll. */}
        <div className="space-y-3 border-t border-lf-hairline px-6 py-5">
          <div className="rounded-lg border border-lf-hairline bg-lf-sand-2 px-3 py-2">
            <div className="lf-kicker-dense font-bold leading-4 text-lf-muted">
              Next best action
            </div>
            <p className="mt-1 text-xs leading-5 text-lf-espresso">
              {nextActionByStep[openStep]}
            </p>
          </div>
          <Button
            type="button"
            variant="commit"
            size="lg"
            fullWidth
            onClick={handleGenerateReportClick}
            leftIcon={<Sparkles size={16} />}
          >
            Create my ADU report
          </Button>
          {onSaveScenario && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={onSaveScenario}
              disabled={savingScenario}
              loading={savingScenario}
              leftIcon={<BookmarkPlus size={16} />}
            >
              {saveNotice ?? (savingScenario ? "Saving…" : "Save this design")}
            </Button>
          )}
        </div>

      </div>
    </section>
  );
}

// ─── Accordion step wrapper ───────────────────────────────────────────────────

function JourneyProgress({
  activeStep,
  completedSteps,
}: {
  activeStep: 1 | 2 | 3;
  completedSteps: Set<number>;
}) {
  return (
    <div className="border-b border-lf-hairline bg-lf-sand-2/65 px-6 py-4">
      <ol className="grid gap-3">
        {journeySteps.map(({ step, title, description }) => {
          const isActive = activeStep === step;
          const isDone = completedSteps.has(step) && !isActive;
          return (
            <li key={step} className="grid grid-cols-[auto_1fr] gap-x-3">
              <span
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-lf-clay text-lf-sand"
                    : isDone
                    ? "bg-lf-forest-soft text-lf-forest"
                    : "bg-lf-card text-lf-muted ring-1 ring-lf-hairline"
                }`}
              >
                {isDone ? <Check size={12} /> : step}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    isActive ? "text-lf-espresso" : "text-lf-muted"
                  }`}
                >
                  {title}
                </div>
                <p className="text-xs leading-5 text-lf-muted">
                  {description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AccordionStep({
  step,
  title,
  isOpen,
  isComplete,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  isOpen: boolean;
  isComplete: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-lf-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lf-clay-ink"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
            isOpen
              ? "bg-lf-clay text-lf-sand"
              : isComplete
              ? "bg-lf-forest-soft text-lf-forest"
              : "bg-lf-sand-2 text-lf-muted"
          }`}
        >
          {isComplete && !isOpen ? <Check size={12} /> : step}
        </span>
        <span className={`flex-1 text-sm font-semibold ${isOpen ? "text-lf-espresso" : "text-lf-muted"}`}>
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-lf-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Animated reveal: grid-template-rows 0fr→1fr gives a smooth height
          transition without measuring. Values are set inline because this
          project's Tailwind build does not emit the arbitrary grid-rows/
          transition-property utilities. `inert` keeps collapsed content out
          of the tab order and the a11y tree. */}
      <div
        className="grid"
        style={{
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: reduceMotion ? undefined : "grid-template-rows 300ms ease-out",
        }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-1" inert={!isOpen}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** True when the user has requested reduced motion; updates live. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabelRow({
  label,
  value,
  htmlFor,
  // Default is espresso ink for non-money values. Money call sites pass
  // `text-lf-forest` (DESIGN.md: green only for payable value).
  valueClass = "font-display text-lf-espresso",
}: {
  label: string;
  value?: string;
  htmlFor?: string;
  valueClass?: string;
}) {
  const Tag = htmlFor ? "label" : "h3";
  return (
    <div className="flex items-center justify-between">
      <Tag
        className="text-sm font-semibold text-lf-espresso"
        {...(htmlFor ? { htmlFor } : {})}
      >
        {label}
      </Tag>
      {value && <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-lf-muted">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-medium text-lf-espresso">{value}</div>
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
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-lf-muted">
        {label}
        <span className="font-mono text-lf-espresso">
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
        className="w-full accent-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-2"
      />
    </label>
  );
}
