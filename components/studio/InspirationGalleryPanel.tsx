"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
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
            Pre-designed ADU precedents. Apply one to your lot.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4 lg:min-h-0">
          {inspirationItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-lf-hairline bg-lf-card overflow-hidden shadow-sm hover:border-lf-clay/35 transition"
            >
              {/* Card Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-40 w-full object-cover"
              />

              <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                  <h3 className="font-display font-semibold text-base text-lf-espresso leading-snug">
                    {item.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-[10px] font-mono font-medium text-lf-muted border border-lf-hairline px-1.5 py-0.5 rounded bg-lf-sand/30">
                      {item.style}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-lf-muted border border-lf-hairline px-1.5 py-0.5 rounded bg-lf-sand/30">
                      {item.sqft} sf ({item.width}&apos;x{item.length}&apos;)
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs leading-relaxed text-lf-muted">{item.summary}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-semibold uppercase tracking-wider text-lf-clay bg-lf-taupe-soft px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer and Button */}
                <div className="flex items-center justify-between border-t border-lf-hairline pt-3 mt-1">
                  <span className="text-[11px] font-bold text-lf-muted uppercase tracking-wider font-mono font-semibold">
                    {item.budgetBand}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
                      appliedId === item.id
                        ? "bg-lf-forest text-lf-sand"
                        : "bg-lf-mahogany text-lf-sand-2 hover:bg-lf-clay"
                    }`}
                  >
                    {appliedId === item.id ? (
                      <>
                        <CheckCircle2 size={13} />
                        Applied ✓
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
