"use client";

import { ChevronLeft } from "lucide-react";
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
  const currentIndex = steps.findIndex((step) => step.state === "current");
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
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lf-muted transition-colors hover:text-lf-espresso ${
          onBack ? "" : "invisible"
        }`}
      >
        <ChevronLeft size={18} />
      </button>
      <ol className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
        {steps.map((step, index) => {
          const isCurrent = step.state === "current";
          const isDone = step.state === "done";
          return (
            <li key={step.id} className="flex min-w-0 items-center">
              {index > 0 && (
                <span
                  aria-hidden
                  className={`mx-1 h-px w-3 sm:w-5 ${
                    index <= currentIndex ? "bg-lf-clay" : "bg-lf-hairline"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={isDone ? () => onStepSelect(step.id) : undefined}
                disabled={!isDone && !isCurrent}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.label}${isDone ? " (completed)" : isCurrent ? " (current)" : ""}`}
                className={`flex min-h-11 items-center gap-1.5 rounded-full px-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-2 ${
                  isCurrent
                    ? "text-lf-clay"
                    : isDone
                      ? "text-lf-forest"
                      : "text-lf-taupe"
                }`}
              >
                {/* Equal explicit width/height — a true circle, never an oval. */}
                <span
                  aria-hidden
                  className={`block h-2 w-2 rounded-full ${
                    isCurrent ? "bg-lf-clay" : isDone ? "bg-lf-forest" : "bg-lf-taupe/40"
                  }`}
                />
                <span className="hidden min-[440px]:inline">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {/* Spacer balancing the back chevron so the dots stay centered. */}
      <span aria-hidden className="w-11 shrink-0" />
    </nav>
  );
}
