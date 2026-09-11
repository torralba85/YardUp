"use client";

import { Check, ChevronLeft } from "lucide-react";
import type { DerivedJourneyStep, MobileJourneyStep } from "@/lib/mobile-journey";

/** Props for {@link JourneyRail}. */
export interface JourneyRailProps {
  /** The five reveals with their derived lifecycle states. */
  steps: DerivedJourneyStep[];
  /** Navigate back one step; hidden on the first step. */
  onBack?: () => void;
  /** Jump to a previously completed step (done steps only). */
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
      className="flex items-center gap-1 border-b border-lf-hairline bg-lf-card px-2 py-1.5"
    >
      <button
        type="button"
        aria-label="Back to previous step"
        onClick={onBack}
        disabled={!onBack}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] text-[#65655F] motion-safe:transition hover:text-[#161616] ${
          onBack ? "" : "invisible"
        }`}
      >
        <ChevronLeft size={18} />
      </button>
      <ol className="grid min-w-0 flex-1 grid-cols-5">
        {steps.map((step) => {
          const isCurrent = step.state === "current";
          const isDone = step.state === "done";
          return (
            <li key={step.id} className="flex min-w-0">
              <button
                type="button"
                onClick={isDone ? () => onStepSelect(step.id) : undefined}
                disabled={!isDone && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.label}${isDone ? " (completed)" : isCurrent ? " (current)" : ""}`}
                className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-[3px] font-sans text-[9px] font-semibold uppercase tracking-[0.08em] motion-safe:transition ${
                  isCurrent
                    ? "text-[#C43708]"
                    : isDone
                      ? "text-[#176B4C]"
                      : "text-[#65655F]"
                }`}
              >
                {isDone ? <Check size={12} aria-hidden="true" /> : (
                <span
                  aria-hidden
                  className={`block h-2 w-2 rounded-full ${
                    isCurrent ? "bg-[#FF5B24]" : isDone ? "bg-[#176B4C]" : "bg-[#DADAD3]"
                  }`}
                />
                )}
                <span>{step.label}</span>
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
