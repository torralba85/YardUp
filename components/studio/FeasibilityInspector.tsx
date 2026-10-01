"use client";

import { Bookmark, BookmarkPlus, Check, ChevronDown, MapPin, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import { NumericField } from "./NumericField";
import { FootprintDiagram, RoofProfile } from "./DesignDiagrams";
import { useEffect, useId, useState } from "react";
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
import { parcelConfidence } from "@/lib/parcel-confidence";
import { Button } from "@/components/ui/Button";
import { Segmented, Select, Slider } from "@/components/ui/Field";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
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
  /** Desktop Design already has a project journey; show only design controls. */
  designOnly?: boolean;
  initialStep?: 1 | 2 | 3;
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
  designOnly = false,
  initialStep = 1,
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
  const [openStep, setOpenStep] = useState<1 | 2 | 3>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const footprintDescriptionId = useId();

  const presetParcel = parcelPresets.find((p) => p.id === parcelId) ?? parcelPresets[0];
  const displayParcel = parcelMode === "live" ? parcel : presetParcel;
  const { footprintKnown, regulationsEstimated } = parcelConfidence(displayParcel);

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

  const footprintGroupKeys = footprintOptions.map(o => `${o.value}-${o.width}-${o.length}`);
  const currentFootprintKey = `${config.footprint}-${config.width}-${config.length}`;
  const { groupProps: footprintGroupProps, getRadioProps: getFootprintRadioProps } = useRadioGroup({
    value: currentFootprintKey,
    onChange: (val) => {
      const [f] = val.split('-');
      onConfigChange(configForFootprint(Number(f), config));
    },
    values: footprintGroupKeys
  });

  const { groupProps: roofGroupProps, getRadioProps: getRoofRadioProps } = useRadioGroup({
    value: config.roof,
    onChange: (val) => onConfigChange({ ...config, roof: val as ADUConfig["roof"] }),
    values: Object.keys(roofLabels) as ADUConfig["roof"][]
  });

  const { groupProps: finishGroupProps, getRadioProps: getFinishRadioProps } = useRadioGroup({
    value: config.finish,
    onChange: (val) => onConfigChange({ ...config, finish: val as ADUConfig["finish"] }),
    values: Object.keys(finishLabels) as ADUConfig["finish"][]
  });

  return (
    <section
      aria-labelledby="feasibility-heading"
      className="w-full shrink-0 border-lot-line bg-lot-chalk lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-y-auto lg:w-[404px] lg:border-l"
    >
      <div className="flex min-h-full flex-col">

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-lot-line px-6 py-5">
          <div>
            <h2
              id="feasibility-heading"
              className="font-display text-2xl font-medium tracking-tight text-lot-ink"
            >
              {designOnly ? "Design your ADU" : "Feasibility Studio"}
            </h2>
            <p className="mt-1 text-sm text-lot-stone">
              {designOnly ? "Try a size. See how it sits on your lot." : "Confirm the lot, shape the ADU, then test the income case."}
            </p>
          </div>
          {!designOnly && <button
            type="button"
            onClick={handleReset}
            className="flex h-11 items-center gap-2 rounded-control px-4 text-sm font-medium text-lot-stone motion-safe:transition hover:bg-lot-surface hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
          >
            <RefreshCcw size={15} />
            Reset
          </button>}
        </div>

        {!designOnly && <JourneyProgress activeStep={openStep} completedSteps={completedSteps} />}

        {/* Accordion steps */}
        <div className="flex-1 divide-y divide-lot-line">

          {/* Step 1 — Your Property */}
          {!designOnly && <AccordionStep
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
                      className="relative flex min-h-11 items-center gap-1 text-xs font-medium text-lot-orange-ink motion-safe:transition hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 before:absolute before:-inset-x-2 before:-inset-y-3"
                    >
                      <RefreshCcw size={12} />
                      Demo mode
                    </button>
                  </div>

                  <div className="flex items-start gap-2 rounded-none border border-lot-line bg-lot-chalk p-3">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-lot-orange-ink" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-lot-ink">
                        {displayParcel.address}
                      </div>
                      <div className="mt-0.5 text-xs text-lot-stone">{displayParcel.city}</div>
                    </div>
                  </div>

                  {"source" in displayParcel && displayParcel.source === "fallback" && (
                    <div
                      role="note"
                      className="flex items-start gap-2 rounded-none border border-status-review/35 bg-status-review-soft p-3 text-xs text-status-review"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0 text-status-review" />
                      Exact data unavailable for this address — using typical estimates. Double-check with your local planning department.
                    </div>
                  )}

                  {parcelError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs text-status-blocked"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                      {parcelError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <LabelRow label="Sample Property" htmlFor="parcel-preset" />
                  <Select
                    id="parcel-preset"
                    value={parcelId}
                    onChange={(event) => onParcelChange(event.target.value)}
                  >
                    {parcelPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.lotArea.toLocaleString()} sf)
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-lot-stone">Or search your address:</p>
                    <AddressSearch onSelect={handleAddressSelect} onSubmitText={handleAddressText} />
                    {parcelError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs text-status-blocked"
                      >
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                        {parcelError}
                      </div>
                    )}
                  </div>
                </>
              )}

              {parcelLoading && (
                <div className="flex items-center gap-2 rounded-none border border-lot-line bg-lot-surface px-3 py-2 text-xs text-lot-stone">
                  <span className="block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
                  Looking up property data…
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Fact label="Lot Area" value={`${displayParcel.lotArea.toLocaleString()} sf`} />
                <Fact label="Lot Dimensions" value={`${displayParcel.lotWidth}' x ${displayParcel.lotLength}'`} />
                <Fact label="Existing Footprint" value={footprintKnown ? `${displayParcel.existingHouseSqft.toLocaleString()} sf` : "Unknown"} />
                <Fact label="Max Coverage" value={`${displayParcel.maxLotCoveragePercent}%${regulationsEstimated ? " (assumed)" : ""}`} />
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
          </AccordionStep>}

          {/* Step 2 — Design Your ADU */}
          <AccordionStep
            step={2}
            plain={designOnly}
            title="Design Your ADU"
            isOpen={openStep === 2}
            isComplete={completedSteps.has(2) && openStep !== 2}
            onToggle={() => toggleStep(2)}
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <LabelRow label="Size and footprint" />
                <div
                  aria-label="ADU footprint size"
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}
                  {...footprintGroupProps}
                >
                  {footprintOptions.map((option) => {
                    const optionKey = `${option.value}-${option.width}-${option.length}`;
                    const isChecked = currentFootprintKey === optionKey;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-describedby={`${footprintDescriptionId}-${option.value}`}
                        {...getFootprintRadioProps(optionKey)}
                        className={`relative flex min-h-28 flex-col items-start rounded-control border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 ${
                          isChecked ? "border-lot-ink bg-lot-ink text-lot-chalk" : "border-lot-line bg-lot-chalk text-lot-ink hover:border-lot-stone"
                        }`}
                      >
                        <span className="flex w-full items-center justify-between gap-1">
                          <span className="whitespace-nowrap font-display text-xl font-medium tabular-nums">{option.label}</span>
                          <FootprintDiagram width={option.width} length={option.length} />
                        </span>
                        <span id={`${footprintDescriptionId}-${option.value}`} className={`text-xs leading-5 ${isChecked ? "text-lot-stone-on-dark" : "text-lot-stone"}`}>
                          {option.summary}<br />{option.width} × {option.length} ft
                        </span>
                        {isChecked && <Check size={13} aria-hidden="true" className="absolute right-2 bottom-3" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-5 text-lot-stone">
                  {selectedOption
                    ? `Selected: ${selectedOption.label} (${selectedOption.summary})`
                    : `Custom size: ${config.footprint.toLocaleString()} sf (${config.width}' x ${config.length}')`}
                </p>
              </div>

              <details open={!designOnly} className="group/dimensions border-y border-lot-line">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
                  Fine-tune dimensions
                  <ChevronDown size={16} aria-hidden="true" className="group-open/dimensions:rotate-180" />
                </summary>
                <div className="space-y-4 pb-4">
                <div className="grid grid-cols-3 items-end gap-2">
                  <NumericField label="Width (ft)" value={config.width} min={1} max={Math.min(80,2000/config.length)} onChange={width=>onConfigChange({...config,width,footprint:width*config.length})}/>
                  <NumericField label="Length (ft)" value={config.length} min={1} max={Math.min(80,2000/config.width)} onChange={length=>onConfigChange({...config,length,footprint:config.width*length})}/>
                  <NumericField label="Wall height (ft)" value={config.height} min={1} max={30} onChange={height=>onConfigChange({...config,height})}/>
                </div>
                <DimensionSlider
                  label="Width"
                  value={config.width}
                  min={16}
                  max={32}
                  suffix="ft"
                  onChange={(value) =>
                    onConfigChange({ ...config, width: value, footprint: value * config.length })
                  }
                />
                <DimensionSlider
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
              </details>

              <div className="space-y-3">
                <LabelRow label="Roof shape" />
                <div aria-label="Roof style" className="grid grid-cols-3 gap-3" {...roofGroupProps}>
                  {Object.entries(roofLabels).map(([key, label]) => {
                    const isChecked = config.roof === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        {...getRoofRadioProps(key as ADUConfig["roof"])}
                        className={`flex h-20 flex-col items-center justify-center gap-1 rounded-control border text-xs font-semibold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 ${
                          isChecked
                            ? "border-lot-ink bg-lot-ink text-lot-chalk shadow-none"
                            : "border-lot-line bg-lot-chalk text-lot-stone hover:border-lot-stone-on-dark hover:bg-lot-surface"
                        }`}
                      >
                        <RoofProfile roof={key as ADUConfig["roof"]} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <LabelRow label="Exterior finish" />
                <div aria-label="Exterior finish" className="grid grid-cols-2 gap-3" {...finishGroupProps}>
                  {Object.entries(finishLabels).map(([key, label]) => {
                    const isChecked = config.finish === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        {...getFinishRadioProps(key as ADUConfig["finish"])}
                        className={`rounded-control border p-2 text-left text-xs font-semibold motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 ${
                          isChecked
                            ? "border-lot-ink bg-lot-ink/5 text-lot-ink ring-1 ring-lot-ink"
                            : "border-lot-line bg-lot-chalk text-lot-stone hover:border-lot-stone-on-dark hover:bg-lot-surface"
                        }`}
                      >
                        <span
                          className="mb-2 block h-8 rounded-none border border-lot-ink/10"
                          style={{ background: finishColors[key as ADUConfig["finish"]] }}
                        />
                        {label}
                      </button>
                    );
                  })}
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

              {!designOnly && <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => handleNextStep(2, 3)}
                rightIcon={<ChevronDown size={15} className="-rotate-90" />}
              >
                Next: Run the numbers
              </Button>}
            </div>
          </AccordionStep>

          {/* Step 3 — Run the Numbers */}
          {!designOnly && <AccordionStep
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
                  valueClass="font-display text-lot-ink tabular-nums"
                />
                <Segmented
                  aria-label="Rental estimate"
                  value={assumptions.rentScenario}
                  onChange={(scenario) =>
                    onAssumptionsChange({ ...assumptions, rentScenario: scenario })
                  }
                  options={(Object.keys(rentLabels) as RentScenario[]).map((scenario) => ({
                    value: scenario,
                    label: rentLabels[scenario],
                  }))}
                />
              </div>

              {result.warnings.length > 0 && (
                <div
                  role="alert"
                  className="rounded-none border border-status-review/35 bg-status-review-soft p-3 text-sm text-status-review"
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
          </AccordionStep>}

        </div>

        {/* Footer CTAs stay in the panel flow so short desktop viewports can scroll. */}
        <div className="space-y-3 border-t border-lot-line px-6 py-5">
          {designOnly && result.warnings.length > 0 && (
            <div role="alert" className="flex items-start gap-2 text-sm text-status-review">
              <TriangleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
              <p><strong>Review needed.</strong> {result.warnings[0]}</p>
            </div>
          )}
          {!designOnly && <div className="rounded-none border border-lot-line bg-lot-surface px-3 py-2">
            <div className="lf-kicker-dense font-bold leading-4 text-lot-stone">
              Next best action
            </div>
            <p className="mt-1 text-xs leading-5 text-lot-ink">
              {nextActionByStep[openStep]}
            </p>
          </div>}
          {!designOnly && <Button
            type="button"
            variant="commit"
            size="lg"
            fullWidth
            onClick={handleGenerateReportClick}
            leftIcon={<Sparkles size={16} />}
          >
            Create my ADU report
          </Button>}
          {onSaveScenario && (
            <Button
              type="button"
              variant={designOnly ? "commit" : "secondary"}
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
    <div className="border-b border-lot-line bg-lot-surface/65 px-6 py-4">
      <ol className="grid gap-3">
        {journeySteps.map(({ step, title, description }) => {
          const isActive = activeStep === step;
          const isDone = completedSteps.has(step) && !isActive;
          return (
            <li key={step} className="grid grid-cols-[auto_1fr] gap-x-3">
              <span
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-lot-orange text-lot-ink"
                    : isDone
                    ? "bg-status-eligible-soft text-status-eligible"
                    : "bg-lot-chalk text-lot-stone ring-1 ring-lot-line"
                }`}
              >
                {isDone ? <Check size={12} /> : step}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    isActive ? "text-lot-ink" : "text-lot-stone"
                  }`}
                >
                  {title}
                </div>
                <p className="text-xs leading-5 text-lot-stone">
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
  plain = false,
  step,
  title,
  isOpen,
  isComplete,
  onToggle,
  children,
}: {
  plain?: boolean;
  step: number;
  title: string;
  isOpen: boolean;
  isComplete: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  if (plain) return <div className="px-6 py-5">{children}</div>;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-6 py-4 text-left motion-safe:transition hover:bg-lot-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lot-orange-ink"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold motion-safe:transition ${
            isOpen
              ? "bg-lot-orange text-lot-ink"
              : isComplete
              ? "bg-status-eligible-soft text-status-eligible"
              : "bg-lot-surface text-lot-stone"
          }`}
        >
          {isComplete && !isOpen ? <Check size={12} /> : step}
        </span>
        <span className={`flex-1 text-sm font-semibold ${isOpen ? "text-lot-ink" : "text-lot-stone"}`}>
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-lot-stone motion-safe:transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
  // Money is neutral; green is reserved for verified status.
  valueClass = "font-display text-lot-ink",
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
        className="text-sm font-semibold text-lot-ink"
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
      <div className="text-xs text-lot-stone">{label}</div>
      <div className="mt-0.5 font-sans text-xs font-medium text-lot-ink">{value}</div>
    </div>
  );
}

/** The shared `Slider`, bound to a clamped numeric dimension with a unit readout. */
function DimensionSlider({
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
    <Slider
      id={`slider-${label.toLowerCase().replace(/\s+/g, "-")}`}
      label={label}
      valueText={`${value} ${suffix}`}
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
    />
  );
}
