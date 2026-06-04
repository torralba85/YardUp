"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { inspirationItems, type InspirationItem } from "@/lib/inspiration-data";

export interface InspirationGalleryPanelProps {
  onApply: (item: InspirationItem) => void;
}

export default function InspirationGalleryPanel({ onApply }: InspirationGalleryPanelProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (item: InspirationItem) => {
    onApply(item);
    setAppliedId(item.id);
    setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <section
      aria-label="Inspiration gallery panel"
      className="w-full shrink-0 border-lf-hairline bg-lf-card lg:h-full lg:max-h-none lg:min-h-0 lg:overflow-hidden xl:w-[404px] xl:border-l"
    >
      <div className="flex h-full flex-col lg:min-h-0">
        <div className="border-b border-lf-hairline px-6 py-5">
          <h2 className="text-2xl font-semibold tracking-tight text-lf-espresso">
            Inspiration Gallery
          </h2>
          <p className="mt-1 text-sm text-lf-muted">
            ADU templates shown as parcel-fit diagrams. Apply one to your lot.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4 lg:min-h-0">
          {inspirationItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-md border border-lf-hairline bg-lf-card transition hover:border-lf-clay/35"
            >
              <ConceptDiagram item={item} />

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="font-display text-base font-semibold leading-snug text-lf-espresso">
                    {item.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded border border-lf-hairline bg-lf-sand/30 px-1.5 py-0.5 font-mono text-[10px] font-medium text-lf-muted">
                      {item.style}
                    </span>
                    <span className="rounded border border-lf-hairline bg-lf-sand/30 px-1.5 py-0.5 font-mono text-[10px] font-medium text-lf-muted">
                      {item.sqft} sf ({item.width}&apos;x{item.length}&apos;)
                    </span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-lf-muted">{item.summary}</p>

                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-lf-taupe-soft px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-lf-clay"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-1 flex items-center justify-between border-t border-lf-hairline pt-3">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-lf-muted">
                    {item.budgetBand}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
                      appliedId === item.id
                        ? "bg-lf-forest text-lf-sand"
                        : "bg-lf-mahogany text-lf-sand-2 hover:bg-lf-clay"
                    }`}
                  >
                    {appliedId === item.id ? (
                      <>
                        <CheckCircle2 size={13} />
                        Applied
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Apply to Studio
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
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
      className="h-40 w-full border-b border-lf-hairline bg-lf-sand-2"
      role="img"
      aria-label={`${item.title} parcel-fit diagram`}
    >
      <rect width="336" height="160" fill="#F8F0E4" />
      <path d="M46 22 294 34 278 138 34 126Z" fill="#E9D4B7" stroke="#8C5B3F" strokeWidth="1.5" />
      <path
        d="M70 42 268 51 256 118 58 110Z"
        fill="#FBF6EE"
        fillOpacity="0.45"
        stroke="#8C5B3F"
        strokeDasharray="6 6"
        strokeWidth="1.2"
      />
      <rect
        x={aduX}
        y={aduY}
        width={aduWidth}
        height={aduLength}
        rx="3"
        fill={finishFill[item.finish]}
        stroke="#592A0F"
        strokeWidth="1.5"
      />
      {item.roof === "gable" ? (
        <path
          d={`M${aduX - 6} ${aduY + 8} L168 ${roofPeak} L${aduX + aduWidth + 6} ${aduY + 8}`}
          fill="none"
          stroke="#592A0F"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
      ) : (
        <path
          d={`M${aduX - 4} ${aduY + 12} L${aduX + aduWidth + 4} ${roofPeak}`}
          fill="none"
          stroke="#592A0F"
          strokeLinecap="round"
          strokeWidth="5"
        />
      )}
      <rect x={aduX + aduWidth * 0.2} y={aduY + aduLength * 0.38} width="16" height="22" rx="2" fill="#F2E5D5" opacity="0.82" />
      <rect x={aduX + aduWidth * 0.58} y={aduY + aduLength * 0.42} width="18" height="28" rx="2" fill="#F2E5D5" opacity="0.82" />
      <path d="M60 116 C112 106 133 121 168 124 C205 128 228 116 270 122" fill="none" stroke="#2F4A38" strokeOpacity="0.34" strokeWidth="8" strokeLinecap="round" />
      <circle cx="70" cy="52" r="10" fill="#2F4A38" opacity="0.85" />
      <circle cx="286" cy="64" r="13" fill="#2F4A38" opacity="0.72" />
      <g transform="translate(18 18)">
        <rect width="78" height="28" rx="4" fill="#261307" />
        <text x="10" y="12" fill="#F2E5D5" fontSize="7" fontWeight="700" letterSpacing="1.1">
          TEMPLATE
        </text>
        <text x="10" y="23" fill="#F2E5D5" fontSize="10" fontWeight="800">
          {item.sqft} sf
        </text>
      </g>
    </svg>
  );
}
