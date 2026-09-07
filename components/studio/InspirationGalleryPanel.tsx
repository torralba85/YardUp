"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { inspirationItems, type InspirationItem } from "@/lib/inspiration-data";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import StyleMatchPanel from "./StyleMatchPanel";
import { Button } from "@/components/ui/Button";

/** Curated starting points and the existing photo-matching workflow. */
export interface InspirationGalleryPanelProps {
  parcel: Parcel & { zoning?: string; source?: string };
  config: ADUConfig;
  onApply: (item: InspirationItem) => void;
  generatedConcepts?: InspirationItem[];
  onGenerationComplete?: (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => void;
  onViewComparison?: (item: InspirationItem) => void;
  styleMatchKey?: number | string;
}

const finishLabels = { cedar: "Cedar", board: "Board & batten", lap: "Lap siding", stucco: "Stucco" };
const roofLabels = { shed: "Shed", flat: "Flat", gable: "Gable" };

/** Full-width catalogue whose height follows its content. */
export default function InspirationGalleryPanel({
  parcel, config, onApply, generatedConcepts = [],
  onGenerationComplete, onViewComparison, styleMatchKey,
}: InspirationGalleryPanelProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const appliedTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (appliedTimerRef.current !== null) window.clearTimeout(appliedTimerRef.current);
  }, []);

  const handleApply = (item: InspirationItem) => {
    onApply(item);
    setAppliedId(item.id);
    setAnnouncement(`${item.title} applied to Studio.`);
    if (appliedTimerRef.current !== null) window.clearTimeout(appliedTimerRef.current);
    appliedTimerRef.current = window.setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <section aria-label="Inspiration gallery panel"
      className="w-full min-w-0 shrink-0 border-t border-lot-line bg-lot-chalk px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h2 className="font-display text-[34px] leading-[1.06] font-medium tracking-[-0.055em] text-lot-ink lg:text-[42px]">
            A small home, considered.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-lot-stone">
            Explore six starting points. Apply a footprint, then refine it on your lot.
          </p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-lot-stone">
          Illustrative concepts · Not construction plans.<br />
          Dimensions, roof and finish apply to the Studio model.
        </p>
      </div>
      <p role="status" className="sr-only">{announcement}</p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2 xl:grid-cols-3">
        {[...generatedConcepts, ...inspirationItems].map((item) => (
          <article key={item.id} aria-label={item.title} className="flex min-w-0 flex-col">
            <figure>
              <div className="relative aspect-[3/2] overflow-hidden bg-lot-chalk">
                {item.mobileImagePath ? (
                  // Static width-descriptor variants let the browser pick per card
                  // width and pixel density, with no runtime image service. A
                  // viewport media query cannot work here: the gallery only renders
                  // at >=1024px (FeasibilityStudio's `isDesktop`), so any
                  // `max-width` source below that never matches.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePath} alt={`${item.title} illustrative architectural model`}
                    srcSet={`${item.mobileImagePath} 600w, ${item.imagePath} 960w`}
                    sizes="(min-width: 1280px) calc((100vw - 320px) / 3), calc((100vw - 300px) / 2)"
                    width={960} height={640} loading="lazy" decoding="async"
                    className="h-full w-full object-contain" />
                ) : (
                  <Image src={item.imagePath} alt={`${item.title} illustrative concept`}
                    fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                    className="object-contain" unoptimized />
                )}
              </div>
              <figcaption className="mt-2 text-[10px] leading-relaxed text-lot-stone">
                {item.isStyleMatched ? "Style-Matched · Illustrative concept" : "Illustrative concept"}
              </figcaption>
            </figure>
            <h3 className="mt-2 font-display text-[22px] leading-tight font-medium tracking-[-0.035em] text-lot-ink">
              {item.title}
            </h3>
            <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-relaxed text-lot-stone tabular-nums">
              <span>{item.sqft.toLocaleString()} sf</span><span aria-hidden="true">/</span>
              <span>{item.width} × {item.length} ft</span><span aria-hidden="true">/</span>
              <span>{finishLabels[item.finish]} · {roofLabels[item.roof]}</span>
            </p>
            <p className="mt-2 mb-4 text-sm leading-relaxed text-lot-stone">{item.summary}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-lot-line pt-4">
              <div>
                <p className="text-[10px] text-lot-stone">Illustrative build budget</p>
                <p className="mt-1 text-sm font-semibold text-lot-ink tabular-nums">{item.budgetBand}</p>
              </div>
              <Button type="button" variant={appliedId === item.id ? "commit" : "primary"}
                size="md" className="min-h-12 px-4" onClick={() => handleApply(item)}
                rightIcon={appliedId === item.id ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}>
                {appliedId === item.id ? "Applied" : "Apply to Studio"}
              </Button>
              {item.isStyleMatched && onViewComparison && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onViewComparison(item)}>
                  Compare
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      <details className="group mt-8 border-t border-lot-line">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-ink [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
            <span className="font-display text-lg font-medium tracking-tight">Match your own home</span>
            <span className="text-sm text-lot-stone">Explore a concept inspired by your existing exterior.</span>
          </span>
          <Plus size={22} aria-hidden="true" className="shrink-0 group-open:rotate-45 motion-safe:transition-transform motion-safe:duration-200" />
        </summary>
        <div className="pt-2 pb-4">
          <StyleMatchPanel key={styleMatchKey} onGenerationComplete={onGenerationComplete}
            parcel={parcel} config={config} />
        </div>
      </details>
    </section>
  );
}
