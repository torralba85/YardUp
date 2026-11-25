"use client";

import { BookmarkPlus, Check, ChevronDown, DoorOpen, MapPin, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import { NumericField } from "./NumericField";
import { FootprintDiagram, RoofProfile } from "./DesignDiagrams";
import { useId, useState } from "react";
import {
  configForFootprint,
  finishColors,
  finishLabels,
  footprintOptions,
  formatCurrency,
  demoPresets,
  parcelPresets,
  roofLabels,
} from "@/lib/feasibility";
import { formatNumber } from "@/lib/intl-format";
import { useParcel } from "@/lib/parcel-context";
import { parcelConfidence } from "@/lib/parcel-confidence";
import { aduSetbacks } from "@/lib/adu-setbacks";
import ParcelDataNotice from "./ParcelDataNotice";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
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
  1: "Search an address or keep the sample lot, then move to backyard home fit.",
  2: "Pick a footprint and finish that still works on the parcel.",
  3: "Choose the rent scenario you trust, then create the report.",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Width/length fields and sliders move in the same half-foot step. */
const DIMENSION_STEP_FT = 0.5;

/** Decimal places in `value`, at least the half-foot step's one. */
function decimalPlaces(value: number) {
  return Math.max(1, (String(value).split(".")[1] ?? "").length);
}

/** Integer units stay exact up to 12 places (80 ft × 10¹² ≪ 2⁵³). */
const MAX_GRID_PLACES = 12;

/**
 * Field and slider bounds on `value`'s own half-foot grid. Browsers count a
 * control's steps from `min`, so a saved off-step span (26.3 ft) stays natively
 * valid and every slider step is reversible. The math runs in integer units of
 * the value's decimal places, so no float noise reaches the attributes.
 * `min` is `floor` (or a smaller saved value) moved down onto the grid; `max` is
 * the longest span on the grid within `limit`. A value finer than the grid can
 * hold exactly gets `step: "any"`, so it is still never natively invalid.
 */
function gridBounds(value: number, floor: number, limit: number) {
  const places = decimalPlaces(value);
  if (places > MAX_GRID_PLACES) {
    return { min: Math.min(floor, value), max: limit, step: "any" as const };
  }
  const unit = 10 ** places;
  const units = Math.round(value * unit);
  const step = Math.round(DIMENSION_STEP_FT * unit);
  const offset = units % step;
  const onGrid = (bound: number) => Math.floor((bound - offset) / step) * step + offset;
  const toFt = (gridUnits: number) => Number((gridUnits / unit).toFixed(places));
  return {
    min: toFt(onGrid(Math.min(Math.round(floor * unit), units))),
    max: toFt(onGrid(Math.floor(limit * unit))),
    step: DIMENSION_STEP_FT,
  };
}

/** Width/length bounds: {@link gridBounds} under the 80 ft and 2,000 sf model caps beside `otherSpan`. */
function spanBounds(value: number, floor: number, otherSpan: number) {
  const other = Math.max(1, otherSpan);
  const bounds = gridBounds(value, floor, Math.min(80, 2000 / other));
  // Float noise in the cap must never lift the footprint past 2,000 sf…
  if (bounds.max * other > 2000) {
    const lower = bounds.step === "any" ? (2000 - 1e-9) / other : bounds.max - DIMENSION_STEP_FT;
    bounds.max = Number(lower.toFixed(decimalPlaces(value)));
  }
  // …and a saved span that already fits is never above the maximum, so blur never clamps it.
  if (value <= 80 && value * other <= 2000) bounds.max = Math.max(bounds.max, value);
  return bounds;
}

/** Props for {@link FeasibilityInspector}. */
export interface FeasibilityInspectorProps {
  /** Desktop Design already has a project journey; show only design controls. */
  designOnly?: boolean;
  showWarnings?: boolean;
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
  /** Called to reset the inspector to defaults. Return `false` if cancelled. */
  onReset: () => boolean | void;
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
  showWarnings = true,
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
  const displaySetbacks = aduSetbacks(displayParcel, config);
  const { footprintKnown, regulationsEstimated, physicalEstimated } = parcelConfidence(displayParcel);

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
    if (!handleReset()) return;
    resetToPreset(presetParcel);
  }

  function handleReset(): boolean {
    if (onReset() === false) return false;
    setOpenStep(1);
    setCompletedSteps(new Set());
    return true;
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
        <PanelHeader
          id="feasibility-heading"
          title={designOnly ? "Design your ADU" : "Feasibility Studio"}
          sub={
            designOnly
              ? "Try a size. See how it sits on your lot."
              : "Confirm the lot, shape the backyard home, then test the income case."
          }
          actions={
            !designOnly ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                leftIcon={<RefreshCcw size={15} />}
                className="text-lot-stone hover:text-lot-ink"
              >
                Reset
              </Button>
            ) : undefined
          }
        />

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
                      <RefreshCcw size={12} aria-hidden="true" />
                      Demo mode
                    </button>
                  </div>

                  <div className="flex items-start gap-2 rounded-none border border-lot-line bg-lot-chalk p-3">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-lot-orange-ink" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-lot-ink">
                        {displayParcel.address}
                      </div>
                      <div className="mt-0.5 text-xs text-lot-stone">{displayParcel.city}</div>
                      {"source" in displayParcel && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-lot-line pt-1.5 text-xs text-lot-stone">
                          <span>
                            {displayParcel.source === "regrid"
                              ? "Regrid parcel record"
                              : displayParcel.source === "county-gis"
                                ? "County GIS parcel record"
                                : "Regional fallback estimate"}
                          </span>
                          {"dataQuality" in displayParcel &&
                            (displayParcel.dataQuality?.fields.address.source.recordId ??
                              displayParcel.dataQuality?.fields.boundaryGeoJson.source.recordId) && (
                            <span translate="no" className="tabular-nums text-lot-ink">
                              · ID{" "}
                              {displayParcel.dataQuality?.fields.address.source.recordId ??
                                displayParcel.dataQuality?.fields.boundaryGeoJson.source.recordId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {"source" in displayParcel && displayParcel.source === "fallback" && (
                    <div
                      role="note"
                      className="flex items-start gap-2 rounded-none border border-status-review/35 bg-status-review-soft p-3 text-xs text-status-review"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0 text-status-review" aria-hidden="true" />
                      Exact data unavailable for this address — using typical estimates. Double-check with your local planning department.
                    </div>
                  )}

                  {parcelError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs text-status-blocked"
                    >
                      <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {parcelError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <LabelRow label="Sample Property" htmlFor="parcel-preset" />
                  <Select
                    id="parcel-preset"
                    name="parcelPreset"
                    autoComplete="off"
                    value={parcelId}
                    onChange={(event) => onParcelChange(event.target.value)}
                  >
                    {demoPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({formatNumber(preset.lotArea)} sf)
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
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        {parcelError}
                      </div>
                    )}
                  </div>
                </>
              )}

              {parcelLoading && (
                <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-none border border-lot-line bg-lot-surface px-3 py-2 text-xs text-lot-stone">
                  <span className="block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
                  Looking up property data…
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Fact label="Lot Area" value={`${formatNumber(displayParcel.lotArea)} sf${physicalEstimated ? " (assumed)" : ""}`} />
                <Fact label="Lot Dimensions" value={`${displayParcel.lotWidth}' x ${displayParcel.lotLength}'${"source" in displayParcel ? " (modeled)" : ""}`} />
                <Fact label="Existing Footprint" value={footprintKnown ? `${formatNumber(displayParcel.existingHouseSqft)} sf` : "Unknown"} />
                <Fact label="Max Coverage" value={`${displayParcel.maxLotCoveragePercent}%${regulationsEstimated ? " (assumed)" : ""}`} />
                {"zoning" in displayParcel && (
                  <Fact label="Zoning" value={String((displayParcel as { zoning: string }).zoning)} noTranslate />
                )}
                <Fact
                  label="ADU Setbacks"
                  value={`${displaySetbacks.front}/${displaySetbacks.side}/${displaySetbacks.rear} ft`}
                />
              </div>
              <ParcelDataNotice parcel={displayParcel} />

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
                        className={`relative flex min-h-28 flex-col items-start rounded-control border px-3 py-2 text-left motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 ${
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
                    : `Custom size: ${formatNumber(config.footprint)} sf (${config.width}' x ${config.length}')`}
                </p>
              </div>

              <details open={!designOnly} className="group/dimensions border-y border-lot-line">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
                  Fine-tune dimensions
                  <ChevronDown size={16} aria-hidden="true" className="motion-safe:transition-transform group-open/dimensions:rotate-180" />
                </summary>
                <div className="space-y-4 pb-4 pt-1">
                  {(() => {
                    // One bound per dimension, shared by field and slider. A narrower
                    // or off-step saved design moves the minimum so it still shows as entered.
                    const { min: minWidth, max: maxWidth, step: widthStep } = spanBounds(config.width, 12, config.length);
                    const { min: minLength, max: maxLength, step: lengthStep } = spanBounds(config.length, 16, config.width);
                    const heightBounds = gridBounds(config.height, 8, 30);
                    return (
                      <>
                        <div className="grid grid-cols-3 items-end gap-2">
                          <NumericField
                            label="Width (ft)"
                            value={config.width}
                            min={minWidth}
                            max={maxWidth}
                            step={widthStep}
                            onChange={(width) =>
                              onConfigChange({ ...config, width, footprint: width * config.length })
                            }
                          />
                          <NumericField
                            label="Length (ft)"
                            value={config.length}
                            min={minLength}
                            max={maxLength}
                            step={lengthStep}
                            onChange={(length) =>
                              onConfigChange({ ...config, length, footprint: config.width * length })
                            }
                          />
                          <NumericField
                            label="Wall height (ft)"
                            value={config.height}
                            min={heightBounds.min}
                            max={30}
                            step={heightBounds.step}
                            onChange={(height) => onConfigChange({ ...config, height })}
                          />
                        </div>
                        <DimensionSlider
                          label="Width"
                          value={config.width}
                          min={minWidth}
                          max={maxWidth}
                          step={widthStep}
                          suffix="ft"
                          onChange={(value) =>
                            onConfigChange({ ...config, width: value, footprint: value * config.length })
                          }
                        />
                        <DimensionSlider
                          label="Length"
                          value={config.length}
                          min={minLength}
                          max={maxLength}
                          step={lengthStep}
                          suffix="ft"
                          onChange={(value) =>
                            onConfigChange({ ...config, length: value, footprint: config.width * value })
                          }
                        />
                      </>
                    );
                  })()}
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
                            : "border-lot-line bg-lot-chalk text-lot-stone hover:border-lot-stone/50 hover:bg-lot-surface"
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
                            : "border-lot-line bg-lot-chalk text-lot-stone hover:border-lot-stone/50 hover:bg-lot-surface"
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
                leftIcon={<DoorOpen size={16} />}
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

              {showWarnings && result.warnings.length > 0 && (
                <div
                  role="alert"
                  className="rounded-none border border-status-review/35 bg-status-review-soft p-3 text-sm text-status-review"
                >
                  <div className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
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
          {!showWarnings && result.heightReviewRequired && (
            <p role="alert" className="text-sm text-status-review">Modeled roof height needs confirmation against local limits. Lower the design or confirm the allowed height.</p>
          )}
          {showWarnings && designOnly && result.warnings.length > 0 && (
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
            Create your ADU report
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
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                  isActive
                    ? "bg-lot-orange text-lot-ink"
                    : isDone
                    ? "bg-status-eligible-soft text-status-eligible"
                    : "bg-lot-chalk text-lot-stone ring-1 ring-lot-line"
                }`}
              >
                {isDone ? <Check size={12} aria-hidden="true" /> : step}
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
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums motion-safe:transition ${
            isOpen
              ? "bg-lot-orange text-lot-ink"
              : isComplete
              ? "bg-status-eligible-soft text-status-eligible"
              : "bg-lot-surface text-lot-stone"
          }`}
        >
          {isComplete && !isOpen ? <Check size={12} aria-hidden="true" /> : step}
        </span>
        <span className={`flex-1 text-sm font-semibold ${isOpen ? "text-lot-ink" : "text-lot-stone"}`}>
          {title}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-lot-stone motion-safe:transition-transform duration-(--duration-disclosure) ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Instant collapse avoids animating layout (`grid-template-rows`);
          compositor-only opacity/transform settle respects reduced motion.
          `inert` keeps collapsed content out of the tab order and a11y tree. */}
      <div
        className="grid"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className={`px-6 pb-6 pt-1 motion-safe:transition-[opacity,transform] motion-safe:duration-(--duration-disclosure) motion-safe:ease-out ${
              isOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
            inert={!isOpen}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
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

function Fact({ label, value, noTranslate }: { label: string; value: string; noTranslate?: boolean }) {
  return (
    <div>
      <div className="text-xs text-lot-stone">{label}</div>
      <div
        translate={noTranslate ? "no" : undefined}
        className="mt-0.5 font-sans text-xs font-medium tabular-nums text-lot-ink"
      >
        {value}
      </div>
    </div>
  );
}

/** The shared `Slider`, bound to a clamped numeric dimension with a unit readout. */
function DimensionSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number | "any";
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
      step={step}
      value={value}
      onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
    />
  );
}
