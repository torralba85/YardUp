"use client";

/**
 * FieldBookIndex — the studio's single navigation, drawn as a surveyor's field
 * book contents page. A "SURVEY OF" subject header sits above four numbered
 * plates; the active plate carries a sliding monument marker and aria-current.
 * Replaces the old 5-item sidebar nav AND the 3-item StudioTabBar.
 */

import { useRef } from "react";
import { AlertTriangle, Check, Circle, CircleDot, X, type LucideIcon } from "lucide-react";
import { PLATES, type PlateTick, type StudioPlate } from "@/lib/studio-plates";

const TICK_META: Record<PlateTick, { icon: LucideIcon; label: string; className: string }> = {
  eligible: { icon: Check, label: "eligible", className: "text-lot-chalk" },
  review: { icon: AlertTriangle, label: "review", className: "text-status-review-on-dark" },
  // On mahogany sidebar — use on-dark brick for AA contrast.
  unlikely: { icon: X, label: "unlikely", className: "text-status-blocked-on-dark" },
  pending: { icon: Circle, label: "not started", className: "text-lot-stone-on-dark" },
  ready: { icon: CircleDot, label: "ready to record", className: "text-lot-chalk" },
};

/** Arrow-key roving focus across the four surveyor plates. */
function useArrowNav(plates: readonly { id: StudioPlate }[]) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = index + direction;
    if (nextIndex >= 0 && nextIndex < plates.length) {
      refs.current[plates[nextIndex].id]?.focus();
    }
  }

  return { refs, handleKeyDown };
}

export interface FieldBookIndexProps {
  active: StudioPlate;
  onNavigate: (plate: StudioPlate) => void;
  statuses: Record<StudioPlate, PlateTick>;
  subject: { address: string; apn?: string; zone?: string };
}

export default function FieldBookIndex({
  active,
  onNavigate,
  statuses,
  subject,
}: FieldBookIndexProps) {
  const { refs, handleKeyDown } = useArrowNav(PLATES);
  return (
    <div>
      <div className="px-2 pb-4">
        <p className="lf-kicker text-lot-stone-on-dark">
          Survey of
        </p>
        <p className="mt-1 truncate font-display text-base font-semibold text-lot-chalk">
          {subject.address}
        </p>
        {(subject.apn || subject.zone) && (
          <p className="mt-0.5 font-sans text-xs text-lot-stone-on-dark">
            {subject.apn ? `APN ${subject.apn}` : ""}
            {subject.apn && subject.zone ? " · " : ""}
            {subject.zone ?? ""}
          </p>
        )}
      </div>

      <nav aria-label="Studio sections" className="space-y-0.5 border-t border-lot-line-dark pt-2">
        {PLATES.map((plate, index) => {
          const isActive = active === plate.id;
          const tick = TICK_META[statuses[plate.id]];
          const TickIcon = tick.icon;
          return (
            <button
              key={plate.id}
              ref={(el) => {
                refs.current[plate.id] = el;
              }}
              type="button"
              onClick={() => onNavigate(plate.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex w-full min-h-11 items-center gap-3 rounded-control py-2 pl-3 pr-2.5 text-left motion-safe:transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk focus-visible:ring-inset ${
                isActive ? "bg-lot-ink/45 ring-1 ring-lot-line-dark" : "hover:bg-lot-chalk/5"
              }`}
            >
              {/* Sliding monument marker — the "you are here" gesture. */}
              <span
                aria-hidden
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-none bg-lot-orange motion-safe:transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`w-6 shrink-0 font-sans text-[11px] font-semibold tracking-[0.08em] ${
                  isActive ? "text-lot-chalk" : "text-lot-stone-on-dark"
                }`}
              >
                {plate.numeral}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${isActive ? "text-lot-chalk" : "text-lot-stone-on-dark"}`}
                >
                  {plate.title}
                  {plate.optional && (
                    <span className="lf-kicker ml-1.5 text-lot-stone-on-dark">
                      optional
                    </span>
                  )}
                </span>
              </span>
              <span className={`inline-flex shrink-0 items-center ${tick.className}`} title={tick.label}>
                <TickIcon size={13} aria-hidden="true" />
                <span className="sr-only"> {tick.label}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
