"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MobileJourneyStep } from "@/lib/mobile-journey";

/**
 * Key under which the journey step rides in `history.state`. Namespaced so it
 * never collides with Next.js router state sharing the same entry.
 */
export const JOURNEY_STEP_STATE_KEY = "lfJourneyStep";

interface JourneyHistoryState {
  [JOURNEY_STEP_STATE_KEY]?: MobileJourneyStep;
}

/** What {@link useJourneyHistory} hands back to the caller. */
export interface JourneyHistoryControls {
  /**
   * Collapse the journey's history back to the current entry. Call from a
   * "start over" reset: without it, the back gesture would return to a step
   * whose underlying parcel state no longer exists.
   */
  reset: () => void;
}

/**
 * Mirror the mobile journey's position into session history.
 *
 * The TWA runs in `display: standalone` with no browser chrome, so the Android
 * back gesture goes straight to the browsing context: without a history entry
 * per reveal, a user three steps deep who swipes back leaves the app and loses
 * the whole study.
 *
 * Entries carry the step in `history.state` and **reuse the current URL**.
 * Encoding the step in the URL is the obvious approach and would break the
 * privacy rule asserted by `e2e/hero.spec.ts:61` — a guest's typed address
 * must never reach the URL or history.
 *
 * Syncing happens in an effect rather than at the ~13 `setJourneyStep` call
 * sites: one of them runs during render (`FeasibilityStudio.tsx:301`), where
 * a `pushState` would be a side effect in the render phase.
 */
export function useJourneyHistory(
  step: MobileJourneyStep,
  onRestore: (step: MobileJourneyStep) => void,
): JourneyHistoryControls {
  // The step history already reflects. `null` means "nothing written yet".
  const syncedRef = useRef<MobileJourneyStep | null>(null);
  // Set while applying a popstate, so the resulting render does not push the
  // step we just travelled back to as if it were a new forward move.
  const restoringRef = useRef(false);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    if (syncedRef.current === step) return;

    if (restoringRef.current) {
      restoringRef.current = false;
      syncedRef.current = step;
      return;
    }

    // Spread the existing state so a co-resident writer's keys survive.
    const next: JourneyHistoryState = { ...window.history.state, [JOURNEY_STEP_STATE_KEY]: step };
    if (syncedRef.current === null) {
      // First sync stamps the entry the app launched on — pushing here would
      // make the first back press a no-op instead of leaving the app.
      window.history.replaceState(next, "", window.location.href);
    } else {
      window.history.pushState(next, "", window.location.href);
    }
    syncedRef.current = step;
  }, [step]);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const state = event.state as JourneyHistoryState | null;
      const restored = state?.[JOURNEY_STEP_STATE_KEY];
      // No key means the entry is not ours — `CertificatePanel.tsx:135`
      // calls replaceState and can drop it. Never guess a step from a
      // stateless entry; leaving the journey put is the safe fallback.
      if (!restored) return;
      restoringRef.current = true;
      syncedRef.current = restored;
      onRestoreRef.current(restored);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    const next: JourneyHistoryState = {
      ...window.history.state,
      [JOURNEY_STEP_STATE_KEY]: "find",
    };
    window.history.replaceState(next, "", window.location.href);
    // Mark "find" as already synced so the reset render does not push it.
    syncedRef.current = "find";
  }, []);

  return { reset };
}
