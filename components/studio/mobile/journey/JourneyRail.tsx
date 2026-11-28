"use client";

import { Check, ChevronLeft } from "lucide-react";
import type { DerivedJourneyStep, MobileJourneyStep } from "@/lib/mobile-journey";

/** Props for {@link JourneyRail}. */
export interface JourneyRailProps {
  /** The five reveals with their derived lifecycle states. */
  steps: DerivedJourneyStep[];
  /** Navigate back one step; hidden on the first step. */
  onBack?: () => void;
  /** Jump back to an earlier step (done or viewed steps only). */
  onStepSelect: (id: MobileJourneyStep) => void;
}

/**
 * Compact persistent progress indicator for the mobile journey: a back
 * chevron plus five labeled dots. Completed steps are tappable; upcoming and
 * locked steps are announced but inert — forward travel happens through each
 * screen's single primary action, never the rail.
 */
export default function JourneyRail({ steps, onBack, onStepSelect }: JourneyRailProps) {
  return (
    <nav
      aria-label="Journey progress"
      className="flex items-center gap-0.5 border-b border-lot-line bg-lot-chalk px-1 py-1.5 min-[380px]:gap-1 min-[380px]:px-2"
    >
      <button
        type="button"
        aria-label="Back to previous step"
        onClick={onBack}
        disabled={!onBack}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-lot-stone motion-safe:transition hover:text-lot-ink ${
          onBack ? "" : "invisible"
        }`}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {/* Columns take their label's width and labels never wrap: equal fifths
          broke "Certificate" mid-word at 390px (2026-11-27 audit). */}
      <ol className="flex min-w-0 flex-1 justify-between gap-0 min-[380px]:gap-0.5">
        {steps.map((step) => {
          const isCurrent = step.state === "current";
          const isDone = step.state === "done";
          // An earlier step opened but not completed (a Certificate not bought).
          const isViewed = step.state === "viewed";
          const reachable = isDone || isViewed;
          return (
            <li key={step.id} className="flex flex-auto">
              <button
                type="button"
                onClick={reachable ? () => onStepSelect(step.id) : undefined}
                disabled={!reachable && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.label}${isDone ? " (completed)" : isCurrent ? " (current)" : isViewed ? " (visited)" : ""}`}
                className={`flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 rounded-control font-sans text-xs font-semibold motion-safe:transition ${
                  isCurrent
                    ? "text-lot-orange-ink"
                    : isDone
                      ? "cursor-pointer text-status-eligible hover:bg-lot-surface"
                      : isViewed
                        ? "cursor-pointer text-lot-ink hover:bg-lot-surface"
                        : "text-lot-stone"
                }`}
              >
                {isDone ? <Check size={12} aria-hidden="true" /> : (
                <span
                  aria-hidden
                  className={`block h-2 w-2 rounded-full ${
                    isCurrent ? "bg-lot-orange" : isViewed ? "bg-lot-ink" : "bg-lot-line"
                  }`}
                />
                )}
                <span className="whitespace-nowrap px-0.5 text-center leading-tight">
                  {step.id === "check" ? (
                    <>
                      <span className="min-[380px]:hidden">Rules</span>
                      <span className="hidden min-[380px]:inline">{step.label}</span>
                    </>
                  ) : step.id === "act" ? (
                    <>
                      <span className="min-[380px]:hidden">Cert.</span>
                      <span className="hidden min-[380px]:inline">{step.label}</span>
                    </>
                  ) : step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {/* Spacer balancing the back chevron so the dots stay centered. */}
      <span aria-hidden className="hidden w-11 shrink-0 min-[440px]:block" />
    </nav>
  );
}
