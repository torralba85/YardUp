"use client";

import { useRef, type ReactNode } from "react";
import { radioIndex } from "@/lib/radio-navigation";
import { NumericField } from "../../NumericField";
import { FootprintDiagram } from "../../DesignDiagrams";
import { ArrowRight, Check, SlidersHorizontal } from "lucide-react";
import {
  configForFootprint,
  finishColors,
  finishLabels,
  type ADUConfig,
  type ExteriorFinish,
  type FeasibilityResult,
} from "@/lib/feasibility";
import { rentRangeLabel } from "../../StudioPreview";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import { Button } from "@/components/ui/Button";

/** Broad size directions — Studio / 1 Bed / 2 Bed, mapped to footprints. */
const SIZE_OPTIONS = [
  { footprint: 400, title: "Studio", blurb: "Guest suite or workspace" },
  { footprint: 600, title: "1 Bedroom", blurb: "Room for everyday living" },
  { footprint: 1000, title: "2 Bedroom", blurb: "A larger home for family" },
] as const;

const FINISHES = Object.keys(finishLabels) as ExteriorFinish[];

/** Props for {@link ShapeStep}. */
export interface ShapeStepProps {
  certificateUnlocked?: boolean;
  /** The active ADU configuration. */
  config: ADUConfig;
  /** Apply a configuration change (size/style). */
  onConfigChange: (config: ADUConfig) => void;
  /** Live result — the rent figure re-reveals as the shape changes. */
  result: FeasibilityResult;
  /** The 3D/aerial scene, revealed here as the shaping surface. */
  scene: ReactNode;
  /** Open the advanced fine-tune drawer (progressive disclosure). */
  onFineTune: () => void;
  /** The one primary action: move on to the feasibility check. */
  onContinue: () => void;
}

/**
 * Reveal 3 · Shape — choose a broad ADU direction: one size (Studio / 1BR /
 * 2BR) and one visual style. The scene appears here as the reveal surface for
 * the massing, and the rent figure updates with each choice. Exact
 * dimensions, roof, and assumptions stay behind the optional Fine-tune action.
 */
export default function ShapeStep({
  certificateUnlocked = false,
  config,
  onConfigChange,
  result,
  scene,
  onFineTune,
  onContinue,
}: ShapeStepProps) {
  const sizes=useRef<(HTMLButtonElement|null)[]>([]);
  const finishes=useRef<(HTMLButtonElement|null)[]>([]);
  return (
    <section
      aria-label="Shape your ADU"
      className="flex min-h-full flex-col"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* The model has its own height; feedback grows in the page flow. */}
      <div className="relative shrink-0 bg-lot-chalk">
        {scene}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5">
        <h1 className="font-display text-[clamp(1.4rem,6vw,1.5625rem)] font-medium leading-[1.1] tracking-tight text-balance text-lot-ink">
          Pick a direction.
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-lot-stone">Try a footprint and check its placement on the lot. Room counts are illustrative.</p>

        <div className="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-label="ADU size">
          {SIZE_OPTIONS.map((option,index) => {
            const preset=configForFootprint(option.footprint,config);
            const selected = config.width===preset.width && config.length===preset.length;
            return (
              <button
                key={option.footprint}
                ref={node=>{ sizes.current[index]=node; }}
                tabIndex={selected || (index===0 && !SIZE_OPTIONS.some(o=>{const p=configForFootprint(o.footprint,config);return p.width===config.width && p.length===config.length;})) ? 0 : -1}
                onKeyDown={event=>{const next=radioIndex(event.key,index,SIZE_OPTIONS.length);if(next===null)return;event.preventDefault();onConfigChange(configForFootprint(SIZE_OPTIONS[next].footprint,config));sizes.current[next]?.focus();}}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onConfigChange(configForFootprint(option.footprint, config))}
                className={`flex min-h-24 items-center gap-3 rounded-control border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 ${
                  selected ? "border-lot-ink bg-lot-ink text-lot-chalk" : "border-lot-line bg-lot-chalk text-lot-ink hover:border-lot-stone"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">{option.title}{selected && <Check size={14} aria-hidden="true" />}</span>
                  <span className={`mt-1 block text-xs leading-5 ${selected ? "text-lot-stone-on-dark" : "text-lot-stone"}`}>
                    {option.footprint.toLocaleString()} ft², {preset.width} × {preset.length} ft<br />{option.blurb}
                  </span>
                </span>
                <FootprintDiagram width={preset.width} length={preset.length} />
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 items-end gap-2" aria-label="Exact ADU dimensions">
          <NumericField label="Width (ft)" value={config.width} min={1} max={Math.min(80,2000/config.length)} onChange={width=>onConfigChange({...config,width,footprint:width*config.length})}/>
          <NumericField label="Length (ft)" value={config.length} min={1} max={Math.min(80,2000/config.width)} onChange={length=>onConfigChange({...config,length,footprint:config.width*length})}/>
          <NumericField label="Wall height (ft)" value={config.height} min={1} max={30} onChange={height=>onConfigChange({...config,height})}/>
        </div>

        <p className="mt-5 text-sm font-semibold text-lot-ink">
          Exterior finish
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Exterior style">
          {FINISHES.map((finish,index) => {
            const selected = config.finish === finish;
            return (
              <Button
                key={finish}
                ref={node=>{ finishes.current[index]=node; }}
                tabIndex={selected?0:-1}
                onKeyDown={event=>{const next=radioIndex(event.key,index,FINISHES.length);if(next===null)return;event.preventDefault();onConfigChange({...config,finish:FINISHES[next]});finishes.current[next]?.focus();}}
                type="button"
                size="md"
                variant={selected ? "selected" : "secondary"}
                role="radio"
                aria-checked={selected}
                onClick={() => onConfigChange({ ...config, finish })}
                className="px-4"
                leftIcon={
                  <span
                    className="block h-3 w-3 rounded-full border border-lot-line"
                    style={{ backgroundColor: finishColors[finish] }}
                  />
                }
              >
                {finishLabels[finish]}
              </Button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-lot-line pt-4">
          <p className="text-xs text-lot-stone">Projected rent / mo</p>
          {certificateUnlocked ? <MoneyFigure value={result.monthlyRent} animate size="inline" tone="onLight" /> : <p className="font-display text-lg font-semibold tabular-nums text-lot-ink">{rentRangeLabel(result)}</p>}
        </div>

        <button
          type="button"
          onClick={onFineTune}
          className="mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-control px-3 text-sm font-semibold text-lot-orange-ink hover:bg-lot-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
        >
          <SlidersHorizontal size={15} />
          Fine-tune dimensions &amp; assumptions
        </button>

        <div className="mt-auto pt-6">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<ArrowRight size={16} />}
            onClick={onContinue}
          >
            Check feasibility
          </Button>
        </div>
      </div>
    </section>
  );
}
