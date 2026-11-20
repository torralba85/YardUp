"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import type { ConstructionBudget } from "@/lib/finance";
import styles from "./CostStack.module.css";
import { CostStackDrawing, type CostLayer } from "./CostStackDrawing";

export type { CostLayer };

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
          <CostStackDrawing
            layer={layer}
            label={`Illustrative exploded view of the ${sqft} sq ft backyard home: the shed roof lifted off its rafters, windows and doors out of their walls, the furnished room on its slab, and the permit drawings beneath.`}
          />
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
