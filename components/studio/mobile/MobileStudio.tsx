"use client";

import { useState, type ReactNode } from "react";
import StudioSheet, { PEEK_SNAP, type SheetSnap } from "./StudioSheet";

export const COACH_SEEN_KEY = "lf-coach-seen";

export interface MobileStudioProps {
  header: ReactNode;
  scene: ReactNode;
  peek: ReactNode;
  controls: ReactNode;
  sections: ReactNode;
}

export default function MobileStudio({ header, scene, peek, controls, sections }: MobileStudioProps) {
  const [snap, setSnap] = useState<SheetSnap | null>(PEEK_SNAP);
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
      <div className="relative z-30 shrink-0">{header}</div>

      {/* The sheet owns gestures while expanded — freezing scene pointer
          events stops sheet drags from also rotating the camera. */}
      <div className={`relative min-h-[160px] flex-1 ${expanded ? "pointer-events-none" : ""}`}>{scene}</div>

      {expanded && (
        <button
          type="button"
          aria-label="Collapse panel and return to lot view"
          onClick={() => setSnap(PEEK_SNAP)}
          className="absolute inset-x-0 top-12 z-30 h-24 cursor-pointer bg-transparent"
        />
      )}

      {coachVisible && (
        // aria-live keeps the note out of Radix's hideOthers sweep — vaul
        // mounts its dialog modal, which would otherwise aria-hide it.
        <div
          role="note"
          aria-live="polite"
          className="absolute inset-x-4 top-16 z-40 rounded-xl border border-lf-hairline bg-lf-card/95 p-3 text-sm text-lf-espresso shadow-lg"
        >
          <p className="font-semibold">Drag your ADU to place it on the lot.</p>
          <p className="mt-1 text-lf-muted">Swipe the bottom panel up for size, finish and full results.</p>
          <button
            type="button"
            onClick={dismissCoach}
            className="mt-2 min-h-11 rounded-lg bg-lf-clay px-4 text-sm font-semibold text-white"
          >
            Got it
          </button>
        </div>
      )}

      <StudioSheet snap={snap} onSnapChange={setSnap} peek={peek} controls={controls} sections={sections} />
    </div>
  );
}
