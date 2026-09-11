"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { DerivedJourneyStep, MobileJourneyStep } from "@/lib/mobile-journey";
import JourneyRail from "./JourneyRail";

/** Props for {@link MobileJourney}. */
export interface MobileJourneyProps {
  /** The mobile header bar. */
  header: ReactNode;
  /** The five reveals with derived lifecycle states. */
  steps: DerivedJourneyStep[];
  /** Navigate back one step; omitted on the first step. */
  onBack?: () => void;
  /** Jump to a previously completed step. */
  onStepSelect: (id: MobileJourneyStep) => void;
  /** The active step's full-screen content. */
  children: ReactNode;
}

/**
 * Mobile five-reveal journey shell (issue #130): a pinned header and compact
 * progress rail over one full-screen step at a time. Replaces the old
 * StepProgress + bottom-sheet composition — each reveal owns the whole screen
 * with a single primary action, and the step content scrolls on its own.
 */
export default function MobileJourney({
  header,
  steps,
  onBack,
  onStepSelect,
  children,
}: MobileJourneyProps) {
  const mainRef = useRef<HTMLElement>(null);
  const activeStep = steps.find((step) => step.state === "current");
  const previousStep = useRef(activeStep?.id);

  useEffect(() => {
    if (previousStep.current === activeStep?.id) return;
    previousStep.current = activeStep?.id;
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      mainRef.current.focus({ preventScroll: true });
    }
  }, [activeStep?.id]);

  return (
    <div data-testid="mobile-journey" className="flex h-dvh flex-col overflow-hidden bg-lf-sand">
      <div className="relative z-(--z-index-nav) shrink-0">{header}</div>
      <div className="relative z-(--z-index-header) shrink-0">
        <JourneyRail steps={steps} onBack={onBack} onStepSelect={onStepSelect} />
      </div>
      <main ref={mainRef} id="main-content" aria-label={activeStep ? `${activeStep.label} step` : undefined} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
