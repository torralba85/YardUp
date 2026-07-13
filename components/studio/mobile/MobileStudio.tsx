"use client";

import { useState, type ReactNode } from "react";
import StudioSheet, { HALF_SNAP, PEEK_SNAP, type SheetSnap } from "./StudioSheet";
import { StepProgress, type Step } from "@/components/ui/StepRail";

/** `localStorage` key marking that the mobile coach marks have been seen. */
export const COACH_SEEN_KEY = "lf-coach-seen";

/** Props for {@link MobileStudio}. */
export interface MobileStudioProps {
  /** The mobile header bar. */
  header: ReactNode;
  /** The 3D scene rendered behind the sheet. */
  scene: ReactNode;
  /** Peek-strip content for the bottom sheet. */
  peek: ReactNode;
  /** Primary content for the active step (visible from half-open). */
  controls: ReactNode;
  /** Supplementary content for the active step (scroll at full-height). */
  sections: ReactNode;
  /** The guided-spine steps; when provided, a StepProgress bar is shown. */
  steps?: Step[];
  /** Called when a step is chosen; the sheet also opens to half if collapsed. */
  onStepSelect?: (id: string) => void;
  /** Human label for the active step's sheet content. */
  activeStepLabel?: string;
  /**
   * The active step's id. When it changes — from the spine or from an in-sheet
   * CTA that jumps steps programmatically — the sheet opens to at least half
   * and focus moves to the new step content.
   */
  activeStepId?: string;
}

/**
 * Mobile studio layout: a full-screen 3D scene with a header overlay and the
 * {@link StudioSheet} bottom drawer. Shows one-time coach marks on first visit,
 * tracked via {@link COACH_SEEN_KEY}.
 *
 * @param props - The {@link MobileStudioProps}.
 */
export default function MobileStudio({
  header,
  scene,
  peek,
  controls,
  sections,
  steps,
  onStepSelect,
  activeStepLabel,
  activeStepId,
}: MobileStudioProps) {
  const [snap, setSnap] = useState<SheetSnap | null>(PEEK_SNAP);
  const [sheetFocusSignal, setSheetFocusSignal] = useState(0);
  const [prevStepId, setPrevStepId] = useState(activeStepId);

  function revealSheet() {
    // Reveal the step's content: if the sheet is collapsed to the peek strip,
    // open it to half so the newly-selected step is visible.
    setSnap((current) => (current === PEEK_SNAP || current === null ? HALF_SNAP : current));
    setSheetFocusSignal((current) => current + 1);
  }

  // Render-phase adjustment (not an effect): any step change — spine tap or an
  // in-sheet CTA like "View certificate" — reveals and focuses the new content,
  // so programmatic jumps behave exactly like spine navigation.
  if (activeStepId !== prevStepId) {
    setPrevStepId(activeStepId);
    revealSheet();
  }

  function handleStepSelect(id: string) {
    onStepSelect?.(id);
    // Reveal directly on tap — this also answers re-selecting the current
    // step, which never flows back as an activeStepId change.
    revealSheet();
  }
  const [coachVisible, setCoachVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COACH_SEEN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const expanded = snap !== PEEK_SNAP && snap !== null;

  function dismissCoach() {
    setCoachVisible(false);
    try {
      window.localStorage.setItem(COACH_SEEN_KEY, "1");
    } catch {
      // Storage denied — coach marks may show again next visit.
    }
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-lf-espresso">
      {/* The header sits one layer above the spine (nav > header) so its
          account dropdown, which extends below the header bar, paints over the
          spine instead of being clipped behind this later sibling. */}
      <div className="relative z-(--z-index-nav) shrink-0">{header}</div>

      {steps && steps.length > 0 && (
        <div className="relative z-(--z-index-header) shrink-0 border-b border-lf-hairline bg-lf-card px-2 py-1.5">
          <StepProgress aria-label="Studio progress" steps={steps} onSelect={handleStepSelect} />
        </div>
      )}

      {/* The sheet owns gestures while expanded — freezing scene pointer
          events stops sheet drags from also rotating the camera. */}
      <div className={`relative min-h-[160px] flex-1 ${expanded ? "pointer-events-none" : ""}`}>{scene}</div>

      {expanded && (
        <button
          type="button"
          aria-label="Collapse panel and return to lot view"
          onClick={() => setSnap(PEEK_SNAP)}
          className="absolute inset-x-0 top-12 z-(--z-index-rail) h-24 cursor-pointer bg-transparent"
        />
      )}

      {coachVisible && (
        // aria-live keeps the note out of Radix's hideOthers sweep — vaul
        // mounts its dialog modal, which would otherwise aria-hide it.
        <div
          role="note"
          aria-live="polite"
          className="absolute inset-x-4 top-16 z-(--z-index-coach) rounded-xl border border-lf-hairline bg-lf-card/95 p-3 text-sm text-lf-espresso shadow-lg"
        >
          <p className="font-semibold">Drag your ADU to place it on the lot.</p>
          <p className="mt-1 text-lf-muted">Swipe the bottom panel up for size, finish and full results.</p>
          <button
            type="button"
            onClick={dismissCoach}
            className="mt-2 min-h-11 rounded-full bg-lf-clay px-4 text-sm font-semibold text-lf-sand"
          >
            Got it
          </button>
        </div>
      )}

      <StudioSheet
        snap={snap}
        onSnapChange={setSnap}
        peek={peek}
        controls={controls}
        sections={sections}
        title={activeStepLabel ? `${activeStepLabel} step` : undefined}
        focusSignal={sheetFocusSignal}
      />
    </div>
  );
}
