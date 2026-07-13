"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Sparkles, Camera, Layers } from "lucide-react";
import { inspirationItems, type InspirationItem } from "@/lib/inspiration-data";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import StyleMatchPanel from "./StyleMatchPanel";
import { Button } from "@/components/ui/Button";

/** Props for {@link InspirationGalleryPanel}. */
export interface InspirationGalleryPanelProps {
  /** Active parcel context sent to the embedded style-match generation flow. */
  parcel: Parcel & { zoning?: string; source?: string };
  /** Active ADU configuration sent to the embedded style-match generation flow. */
  config: ADUConfig;
  /** Called when the user applies a concept's config to the studio. */
  onApply: (item: InspirationItem) => void;
  /** AI style-match concepts to show alongside the curated gallery. */
  generatedConcepts?: InspirationItem[];
  /** Called when a style-match generation completes with its result. */
  onGenerationComplete?: (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => void;
  /** Called to open the before/after comparison for a concept. */
  onViewComparison?: (item: InspirationItem) => void;
  /** Key that, when changed, resets the embedded style-match panel. */
  styleMatchKey?: number | string;
}

/**
 * The inspiration gallery: a grid of curated ADU concepts plus any AI
 * style-matched concepts, with actions to apply a concept to the studio or open
 * its before/after comparison. Embeds the {@link StyleMatchPanel} uploader.
 *
 * @param props - The {@link InspirationGalleryPanelProps}.
 */
export default function InspirationGalleryPanel({
  parcel,
  config,
  onApply,
  generatedConcepts = [],
  onGenerationComplete,
  onViewComparison,
  styleMatchKey,
}: InspirationGalleryPanelProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [viewModes, setViewModes] = useState<Record<string, "image" | "diagram">>({});
  const appliedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (appliedTimerRef.current !== null) window.clearTimeout(appliedTimerRef.current);
    };
  }, []);

  const handleApply = (item: InspirationItem) => {
    onApply(item);
    setAppliedId(item.id);
    if (appliedTimerRef.current !== null) window.clearTimeout(appliedTimerRef.current);
    appliedTimerRef.current = window.setTimeout(() => setAppliedId(null), 1500);
  };

  const getViewMode = (id: string) => viewModes[id] || "image";
  const setCardView = (id: string, mode: "image" | "diagram") => {
    setViewModes((prev) => ({ ...prev, [id]: mode }));
  };

  const allItems = [...generatedConcepts, ...inspirationItems];

  return (
    <section
      aria-label="Inspiration gallery panel"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-hidden xl:w-[404px] xl:border-l"
    >
      <div className="flex h-full flex-col lg:min-h-0">
        <div className="border-b border-lf-hairline px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-lf-espresso font-display">
            Inspiration Gallery
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            Explore standard ADU designs. Toggle between real-world 3D rendering and site-fit massing.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4 lg:min-h-0">
          <StyleMatchPanel
            key={styleMatchKey}
            onGenerationComplete={onGenerationComplete}
            parcel={parcel}
            config={config}
          />

          {allItems.map((item) => {
            const viewMode = getViewMode(item.id);
            return (
              <div
                key={item.id}
                className="group overflow-hidden rounded-md border border-lf-hairline bg-lf-card shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-lf-clay/50 hover:shadow-md"
              >
                {/* Media area with toggling Views */}
                <div className="relative h-44 w-full overflow-hidden bg-lf-sand-2 border-b border-lf-hairline">
                  {/* Real View (Image) */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                      viewMode === "image" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    <Image
                      src={item.imagePath}
                      alt={`${item.title} Real 3D Render`}
                      fill
                      sizes="(max-width: 768px) 100vw, 384px"
                      className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                      unoptimized // Served locally, bypass dynamic resizing costs/issues
                    />
                  </div>

                  {item.isStyleMatched && (
                    <div className="absolute top-3 left-3 z-20 rounded-md bg-lf-clay px-2 py-0.5 border border-lf-sand/20 shadow-md">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-lf-sand">
                        Style-Matched
                      </span>
                    </div>
                  )}


                  {/* 3D Massing View (SVG) */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                      viewMode === "diagram" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    <ConceptDiagram item={item} />
                  </div>

                  {/* Toggle Capsule */}
                  <div className="absolute top-3 right-3 z-20 flex gap-0.5 rounded-full bg-lf-espresso/85 p-0.5 backdrop-blur-md border border-lf-sand/10 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setCardView(item.id, "image")}
                      className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lf-clay focus-visible:ring-offset-1 focus-visible:ring-offset-lf-espresso before:absolute before:-inset-y-3 before:-inset-x-1 ${
                        viewMode === "image"
                          ? "bg-lf-clay text-lf-sand font-bold shadow-sm"
                          : "text-lf-sand/60 hover:text-lf-sand"
                      }`}
                    >
                      <Camera size={10} />
                      Real View
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardView(item.id, "diagram")}
                      className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lf-clay focus-visible:ring-offset-1 focus-visible:ring-offset-lf-espresso before:absolute before:-inset-y-3 before:-inset-x-1 ${
                        viewMode === "diagram"
                          ? "bg-lf-clay text-lf-sand font-bold shadow-sm"
                          : "text-lf-sand/60 hover:text-lf-sand"
                      }`}
                    >
                      <Layers size={10} />
                      Massing
                    </button>
                  </div>
                </div>

                {/* Card Details */}
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-display text-base font-semibold leading-snug text-lf-espresso group-hover:text-lf-clay transition-colors duration-200">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-md border border-lf-hairline bg-lf-sand/30 px-1.5 py-0.5 font-mono text-[10px] font-medium text-lf-muted uppercase tracking-wider">
                        {item.style}
                      </span>
                      <span className="rounded-md border border-lf-hairline bg-lf-sand/30 px-1.5 py-0.5 font-mono text-[10px] font-medium text-lf-muted">
                        {item.sqft} sf ({item.width}&apos;x{item.length}&apos;)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-lf-muted">{item.summary}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-lf-taupe-soft px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-lf-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-lf-hairline pt-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-lf-muted">
                        {item.budgetBand}
                      </span>
                      {item.isStyleMatched && onViewComparison && (
                        <>
                          <span className="text-lf-hairline">|</span>
                          <button
                            type="button"
                            onClick={() => onViewComparison(item)}
                            className="relative flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-lf-clay hover:text-lf-espresso transition-colors cursor-pointer before:absolute before:-inset-y-4 before:-inset-x-2"
                          >
                            Compare
                          </button>
                        </>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant={appliedId === item.id ? "commit" : "primary"}
                      size="md"
                      onClick={() => handleApply(item)}
                      leftIcon={appliedId === item.id ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                    >
                      {appliedId === item.id ? "Applied" : "Apply to Studio"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ConceptDiagram({ item }: { item: InspirationItem }) {
  const aduWidth = Math.max(48, Math.min(104, item.width * 3.1));
  const aduLength = Math.max(54, Math.min(118, item.length * 2.4));
  const aduX = 168 - aduWidth / 2;
  const aduY = 88 - aduLength / 2;
  const roofPeak = item.roof === "gable" ? aduY - 16 : aduY + 10;
  const finishFill: Record<InspirationItem["finish"], string> = {
    cedar: "#B16C39",
    lap: "#CFC8B8",
    stucco: "#D9D1BF",
    board: "#253038",
  };

  return (
    <svg
      viewBox="0 0 336 160"
      className="h-full w-full bg-lf-sand-2"
      role="img"
      aria-label={`${item.title} parcel-fit diagram`}
    >
      <defs>
        {/* Adds a soft 3D-like depth to the massing model */}
        <filter id="adu-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#261307" floodOpacity="0.22" />
        </filter>
        <filter id="roof-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#261307" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect width="336" height="160" fill="#F8F0E4" />
      {/* Parcel Lot */}
      <path d="M46 22 294 34 278 138 34 126Z" fill="#E9D4B7" stroke="#8C5B3F" strokeWidth="1.5" />
      {/* Setback lines */}
      <path
        d="M70 42 268 51 256 118 58 110Z"
        fill="#FBF6EE"
        fillOpacity="0.45"
        stroke="#8C5B3F"
        strokeDasharray="6 6"
        strokeWidth="1.2"
      />
      {/* ADU Footprint Massing */}
      <rect
        x={aduX}
        y={aduY}
        width={aduWidth}
        height={aduLength}
        rx="3"
        fill={finishFill[item.finish]}
        stroke="#592A0F"
        strokeWidth="1.5"
        filter="url(#adu-shadow)"
      />
      {/* Roof Style Overlay */}
      {item.roof === "gable" ? (
        <path
          d={`M${aduX - 6} ${aduY + 8} L168 ${roofPeak} L${aduX + aduWidth + 6} ${aduY + 8}`}
          fill="none"
          stroke="#592A0F"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
          filter="url(#roof-shadow)"
        />
      ) : (
        <path
          d={`M${aduX - 4} ${aduY + 12} L${aduX + aduWidth + 4} ${roofPeak}`}
          fill="none"
          stroke="#592A0F"
          strokeLinecap="round"
          strokeWidth="5"
          filter="url(#roof-shadow)"
        />
      )}
      {/* Door and Window representation */}
      <rect x={aduX + aduWidth * 0.2} y={aduY + aduLength * 0.38} width="16" height="22" rx="2" fill="#F2E5D5" opacity="0.82" />
      <rect x={aduX + aduWidth * 0.58} y={aduY + aduLength * 0.42} width="18" height="28" rx="2" fill="#F2E5D5" opacity="0.82" />
      {/* Trees & Landscaping paths */}
      <path d="M60 116 C112 106 133 121 168 124 C205 128 228 116 270 122" fill="none" stroke="#2F4A38" strokeOpacity="0.34" strokeWidth="8" strokeLinecap="round" />
      <circle cx="70" cy="52" r="10" fill="#2F4A38" opacity="0.85" />
      <circle cx="286" cy="64" r="13" fill="#2F4A38" opacity="0.72" />
      {/* Dimension badge */}
      <g transform="translate(18 18)">
        <rect width="78" height="28" rx="4" fill="#261307" />
        <text x="10" y="12" fill="#F2E5D5" fontSize="7" fontWeight="700" style={{ fontFamily: "var(--font-mono)" }} letterSpacing="1.1">
          TEMPLATE
        </text>
        <text x="10" y="23" fill="#F2E5D5" fontSize="10" fontWeight="800" style={{ fontFamily: "var(--font-mono)" }}>
          {item.sqft} sf
        </text>
      </g>
    </svg>
  );
}
