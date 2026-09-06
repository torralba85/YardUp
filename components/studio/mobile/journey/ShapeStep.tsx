"use client";

import { useRef, type ReactNode } from "react";
import { radioIndex } from "@/lib/radio-navigation";
import { NumericField } from "../../NumericField";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import {
  configForFootprint,
  finishColors,
  finishLabels,
  type ADUConfig,
  type ExteriorFinish,
  type FeasibilityResult,
} from "@/lib/feasibility";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import { Button } from "@/components/ui/Button";

/** Broad size directions — Studio / 1 Bed / 2 Bed, mapped to footprints. */
const SIZE_OPTIONS = [
  { footprint: 400, title: "Studio", blurb: "400 ft² · sleeps 1–2" },
  { footprint: 600, title: "1 Bedroom", blurb: "600 ft² · most popular" },
  { footprint: 1000, title: "2 Bedroom", blurb: "1,000 ft² · max rent" },
] as const;

const FINISHES = Object.keys(finishLabels) as ExteriorFinish[];

/** Props for {@link ShapeStep}. */
export interface ShapeStepProps {
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
      {/* Taller scene band so massing, gesture hint, and view chrome all fit
          without clipping on modern phones; still leaves room for controls. */}
      <div className="relative h-[52dvh] min-h-[360px] max-h-[560px] shrink-0 overflow-hidden bg-lf-espresso">
        {scene}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="lf-kicker text-lf-clay">Step 3 · Shape</p>
            <h1 className="mt-1 font-display text-[clamp(1.4rem,6vw,1.5625rem)] font-semibold leading-[1.1] text-balance text-lf-espresso">
              Pick a direction.
            </h1>
          </div>
          <div className="text-right">
            <p className="lf-dataprint text-lf-muted">
              Projected rent / mo
            </p>
            <MoneyFigure value={result.monthlyRent} animate size="inline" tone="forest" className="mt-0.5" />
          </div>
        </div>

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
                className={`min-h-14 rounded-lg border-2 bg-lf-card px-4 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
                  selected ? "border-lf-clay bg-lf-clay/5" : "border-lf-hairline"
                }`}
              >
                <span className="block font-semibold text-lf-espresso">{option.title}</span>
                <span className="text-sm text-lf-muted">{option.blurb}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Exact ADU dimensions">
          <NumericField label="Width (ft)" value={config.width} min={1} max={Math.min(80,2000/config.length)} onChange={width=>onConfigChange({...config,width,footprint:width*config.length})}/>
          <NumericField label="Length (ft)" value={config.length} min={1} max={Math.min(80,2000/config.width)} onChange={length=>onConfigChange({...config,length,footprint:config.width*length})}/>
          <NumericField label="Wall height (ft)" value={config.height} min={1} max={30} onChange={height=>onConfigChange({...config,height})}/>
        </div>

        <p className="mt-5 lf-kicker-dense text-lf-muted">
          Style
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
                    className="block h-3 w-3 rounded-full border border-lf-hairline"
                    style={{ backgroundColor: finishColors[finish] }}
                  />
                }
              >
                {finishLabels[finish]}
              </Button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onFineTune}
          className="mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 text-sm font-semibold text-lf-clay transition hover:bg-lf-taupe-soft"
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
