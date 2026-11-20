"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import type { ConstructionBudget } from "@/lib/finance";
import styles from "./CostStack.module.css";

export type CostLayer = "roof" | "openings" | "shell" | "soft";

const LAYERS: readonly CostLayer[] = ["roof", "openings", "shell", "soft"];

// The pin follows the landing's model section: motion allowed and a screen
// with room for the stage. Anywhere else the drawing stays exploded and the
// ledger alone picks the layer.
const PIN_QUERY = "(prefers-reduced-motion: no-preference) and (min-width: 801px) and (min-height: 700px)";

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** The layer scroll shows at a point in the pinned travel (0–1). */
export function layerAtProgress(progress: number): CostLayer {
  if (progress < 0.36) return "roof";
  if (progress < 0.52) return "openings";
  if (progress < 0.68) return "shell";
  return "soft";
}

/**
 * How far the layers stand apart (0 assembled, 1 exploded): they lift apart
 * as the stage pins and settle back together at the end of the travel, so
 * the last frame is the whole home beside its total.
 */
export function separationAtProgress(progress: number): number {
  return smoothstep(0.02, 0.2, progress) * (1 - smoothstep(0.86, 0.98, progress));
}

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * An exploded axonometric of the demo backyard home beside the Studio
 * engine's construction budget: roof, openings, shell, and the design and
 * permit allowance. Selecting a ledger row (or scrolling the pinned stage)
 * brings that layer forward. The drawing is illustrative; the figures are the
 * engine's.
 */
export function CostStack({
  budget,
  costLow,
  costHigh,
  sqft = 600,
}: {
  budget: ConstructionBudget;
  costLow: number;
  costHigh: number;
  sqft?: number;
}) {
  const [layer, setLayer] = useState<CostLayer>("roof");
  const rootRef = useRef<HTMLDivElement>(null);
  const manualAtRef = useRef(0);

  const hardCosts = budget.total - budget.softCosts;
  const softRate = hardCosts > 0 ? Math.round((budget.softCosts / hardCosts) * 100) : 0;
  const shell = budget.baseConstruction + budget.regionalAdjustment;
  const baseRate = sqft > 0 ? Math.round(budget.baseConstruction / sqft) : 0;
  const rows: Record<CostLayer, { index: string; title: string; detail: string; amount: number }> = {
    roof: {
      index: "01",
      title: "Roof",
      detail: budget.roofPremium === 0 ? "Shed profile, included in the base rate" : "Roof profile premium over the base rate",
      amount: budget.roofPremium,
    },
    openings: {
      index: "02",
      title: "Openings",
      detail: "Windows and doors allowance",
      amount: budget.openings,
    },
    shell: {
      index: "03",
      title: "Shell",
      detail:
        budget.regionalAdjustment === 0
          ? `${sqft.toLocaleString("en-US")} sq ft at ${money(baseRate)}/sq ft construction base`
          : `${sqft.toLocaleString("en-US")} sq ft construction base, with regional adjustment`,
      amount: shell,
    },
    soft: {
      index: "04",
      title: "Soft costs",
      detail: `${softRate}% allowance for design, engineering and permits`,
      amount: budget.softCosts,
    },
  };

  const group = useRadioGroup({
    value: layer,
    onChange: (next) => {
      manualAtRef.current = performance.now();
      setLayer(next);
    },
    values: LAYERS,
  });

  // Pinned, the stage holds while the page scrolls past it and the scroll
  // position drives the separation and the active layer. A layer picked by
  // hand holds until scroll crosses into another band, as in the model
  // section above.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    const pinQuery = window.matchMedia(PIN_QUERY);
    let frame = 0;
    let band: CostLayer | null = null;
    const unpin = () => {
      delete root.dataset.pinned;
      delete root.dataset.exploded;
      root.style.removeProperty("--stack-sep");
      root.style.removeProperty("--stack-progress");
      band = null;
    };
    const update = () => {
      frame = 0;
      if (!pinQuery.matches) {
        unpin();
        return;
      }
      root.dataset.pinned = "true";
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      const sep = separationAtProgress(progress);
      root.style.setProperty("--stack-sep", sep.toFixed(4));
      root.style.setProperty("--stack-progress", progress.toFixed(4));
      root.dataset.exploded = sep > 0.4 ? "true" : "false";
      const next = layerAtProgress(progress);
      if (next !== band) {
        band = next;
        if (performance.now() - manualAtRef.current > 300) setLayer(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    pinQuery.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      pinQuery.removeEventListener("change", schedule);
      unpin();
    };
  }, []);

  const active = rows[layer];
  const isActive = (key: CostLayer) => (key === layer ? "true" : "false");

  return (
    <div ref={rootRef} className={styles.stack} data-layer={layer}>
      <div className={styles.stage}>
        <figure className={styles.figure}>
          <p className={styles.readout} aria-hidden="true">
            <span>
              {active.index} · {active.title}
            </span>
            <strong>{money(active.amount)}</strong>
          </p>
          <svg
            className={styles.drawing}
            viewBox="150 112 500 532"
            role="img"
            aria-label={`Illustrative exploded view of the ${sqft} sq ft backyard home: roof, windows and doors, shell on its slab, and the design and permit drawings beneath.`}
          >
            <defs>
              <pattern id="cost-stack-seam" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                <line className={styles.seam} x1="0" y1="0" x2="0" y2="14" />
              </pattern>
              <pattern id="cost-stack-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line className={styles.hatch} x1="0" y1="0" x2="0" y2="9" />
              </pattern>
            </defs>

            {/* Alignment rails: the layers share one vertical axis. */}
            <g className={styles.rails}>
              <line x1="210" y1="150" x2="210" y2="600" />
              <line className={styles.railCenter} x1="380" y1="215" x2="380" y2="630" />
              <line x1="550" y1="150" x2="550" y2="600" />
            </g>

            {/* 04 · Design, engineering and permits: the drawing set under the home. */}
            <g className={`${styles.layer} ${styles.soft}`} data-active={isActive("soft")}>
              <polygon className={styles.sheet} points="380,392 592,478 380,564 168,478" />
              <polygon className={styles.sheetHatch} points="380,392 592,478 380,564 168,478" />
              <polygon className={styles.sheetLine} points="380,426 507,478 380,530 253,478" />
              <polyline className={styles.sheetLine} points="316,452 444,504" />
              <polyline className={styles.sheetLine} points="380,426 380,452 349,465" />
              <polyline className={styles.sheetDim} points="241,483 368,535" />
              <polyline className={styles.sheetDim} points="392,535 519,483" />
              <circle className={styles.stamp} cx="520" cy="506" r="9" />
              <g className={styles.callout}>
                <line x1="592" y1="478" x2="608" y2="478" />
                <circle cx="624" cy="478" r="15" />
                <text x="624" y="483">04</text>
              </g>
            </g>

            {/* 03 · Shell: slab, floor, walls and deck. */}
            <g className={`${styles.layer} ${styles.shell}`} data-active={isActive("shell")}>
              <polygon className={styles.slabTop} points="380,406 550,476 380,546 210,476" />
              <polygon className={styles.slabLeft} points="210,476 380,546 380,560 210,490" />
              <polygon className={styles.slabRight} points="380,546 550,476 550,490 380,560" />
              <polygon className={styles.floor} points="380,382 544,450 380,518 216,450" />
              <polygon className={styles.wallInner} points="210,342 380,272 380,382 210,452" />
              <polygon className={styles.wallInnerShade} points="380,272 550,342 550,452 380,382" />
              <polygon className={styles.wallFront} points="210,342 252,359 252,469 210,452" />
              <polygon className={styles.wallFront} points="344,397 380,412 380,522 344,507" />
              <polygon className={styles.wallFront} points="252,359 344,397 344,415 252,377" />
              <polygon className={styles.wallSide} points="380,412 550,342 550,452 380,522" />
              <polygon className={styles.windowFrame} points="424,410 510,375 510,404 424,439" />
              <polygon className={styles.glass} points="426,411 508,377 508,402 426,436" />
              <polyline className={styles.edge} points="210,342 380,412 550,342" />
              <polygon className={styles.deckTop} points="204,454 348,513 312,528 168,469" />
              <polygon className={styles.deckEdge} points="168,469 312,528 312,535 168,476" />
              <polygon className={styles.deckSide} points="312,528 348,513 348,520 312,535" />
              <g className={styles.callout}>
                <line x1="550" y1="398" x2="566" y2="398" />
                <circle cx="582" cy="398" r="15" />
                <text x="582" y="403">03</text>
              </g>
            </g>

            {/* 02 · Openings: the full-height glazing wall. */}
            <g className={`${styles.layer} ${styles.openings}`} data-active={isActive("openings")}>
              <polygon className={styles.glazing} points="252,377 344,415 344,507 252,469" />
              <line className={styles.mullion} x1="282" y1="389.5" x2="282" y2="481.5" />
              <line className={styles.mullion} x1="313" y1="402.5" x2="313" y2="494.5" />
              <polygon className={styles.glint} points="260,383 276,390 264,471 255,467" />
              <g className={styles.callout}>
                <line x1="252" y1="414" x2="236" y2="408" />
                <circle cx="220" cy="402" r="15" />
                <text x="220" y="407">02</text>
              </g>
            </g>

            {/* 01 · Roof: shed profile over its soffit. */}
            <g className={`${styles.layer} ${styles.roof}`} data-active={isActive("roof")}>
              <polygon className={styles.soffit} points="194,344 380,420 568,342 382,266" />
              <polygon className={styles.roofTop} points="190,322 380,400 572,334 382,256" />
              <polygon className={styles.roofSeam} points="190,322 380,400 572,334 382,256" />
              <polygon className={styles.roofFront} points="190,322 380,400 380,411 190,333" />
              <polygon className={styles.roofSide} points="380,400 572,334 572,345 380,411" />
              <polygon className={styles.skylight} points="310,308 386,339 426,325 350,294" />
              <g className={styles.callout}>
                <line x1="572" y1="334" x2="588" y2="326" />
                <circle cx="604" cy="318" r="15" />
                <text x="604" y="323">01</text>
              </g>
            </g>
          </svg>
          <figcaption>Illustrative exploded view, not to scale</figcaption>
        </figure>

        <div className={styles.ledger}>
          <p className={styles.kicker}>WHAT THE BUILD COST IS MADE OF</p>
          <h3>Take it apart, layer by layer.</h3>
          <p className={styles.lead}>
            The same Studio engine as the estimate above, split into what you would actually build.
          </p>
          <div className={styles.rows} {...group.groupProps} aria-label="Build cost layers">
            {LAYERS.map((key) => {
              const row = rows[key];
              return (
                <Button key={key} variant="ghost" className={styles.row} {...group.getRadioProps(key)}>
                  <span className={styles.rowIndex}>{row.index}</span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{row.title}</span>
                    <span className={styles.rowDetail}>{row.detail}</span>
                  </span>
                  <span className={styles.rowAmount}>{money(row.amount)}</span>
                </Button>
              );
            })}
          </div>
          <dl className={styles.total}>
            <div>
              <dt>Central estimate</dt>
              <dd>{money(budget.total)}</dd>
            </div>
            <div>
              <dt>Estimate range</dt>
              <dd>
                {money(costLow / 1000)}k–{money(costHigh / 1000)}k
              </dd>
            </div>
          </dl>
          <p className={styles.note}>
            Modeled allowances, not contractor quotes. Site work, utility extensions and local fees need
            project-specific quotes.
          </p>
          <div className={styles.rail} aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
