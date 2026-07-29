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
   * Stamp the current history entry's step as "find" so the post-reset
   * position is recorded. Call from a "start over" reset.
   *
   * This does **not** unwind entries pushed earlier in the abandoned journey
   * — `history.go(-n)` is async, generates popstate churn, and risks
   * overshooting out of the app entirely in a TWA. Those stale entries are
   * left in the stack; they become inert because the consumer refuses to
   * restore to a step `deriveJourneySteps` reports as `locked`, and after a
   * reset nothing past Find is reachable. Neutralized by unreachability, not
   * by removal.
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
 * sites: one of them is FeasibilityStudio's render-phase parcelMode-change
 * adjustment, which advances the journey synchronously during render, where
 * a `pushState` would be a side effect in the render phase.
 *
 * @param enabled - Pass `false` to make every side effect (sync, popstate
 * listening, `reset()`) a no-op — used to disable this entirely on desktop,
 * which never renders the journey and must not observe any of its side
 * effects either. Defaults to `true`.
 */
export function useJourneyHistory(
  step: MobileJourneyStep,
  onRestore: (step: MobileJourneyStep) => void,
  enabled = true,
): JourneyHistoryControls {
  // The step history already reflects. `null` means "nothing written yet".
  const syncedRef = useRef<MobileJourneyStep | null>(null);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    // Bail out before touching syncedRef — not after — so a disabled pass
    // leaves it exactly as it found it. This matters because `isDesktop`
    // (this hook's real-world `enabled` source) reports its SSR/first-paint
    // default before `useMediaQuery` corrects to the real viewport: every
    // mobile page load runs this effect once disabled, then once enabled.
    // Leaving syncedRef untouched on the disabled pass means the enabled
    // pass still finds `syncedRef.current === null` and performs a correct
    // first replaceState instead of a spurious push.
    if (!enabled) return;
    if (syncedRef.current === step) return;

    // If the current entry already records this step, we arrived here by a
    // back/forward navigation rather than a forward move — adopt it without
    // adding an entry. Deriving this from history itself (instead of a flag
    // the consumer must cooperate to clear) keeps the sync self-correcting.
    const recorded = (window.history.state as JourneyHistoryState | null)?.[JOURNEY_STEP_STATE_KEY];
    if (recorded === step) {
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
  }, [step, enabled]);

  useEffect(() => {
    if (!enabled) return;

    function handlePopState(event: PopStateEvent) {
      const state = event.state as JourneyHistoryState | null;
      const restored = state?.[JOURNEY_STEP_STATE_KEY];
      // No key means the entry is not ours — `CertificatePanel.tsx:135`
      // calls replaceState and can drop it. Never guess a step from a
      // stateless entry; leaving the journey put is the safe fallback.
      if (restored === undefined) return;
      onRestoreRef.current(restored);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [enabled]);

  const reset = useCallback(() => {
    if (typeof window === "undefined" || !enabled) return;
    const next: JourneyHistoryState = {
      ...window.history.state,
      [JOURNEY_STEP_STATE_KEY]: "find",
    };
    window.history.replaceState(next, "", window.location.href);
    // Mark "find" as already synced so the reset render does not push it.
    syncedRef.current = "find";
  }, [enabled]);

  return { reset };
}
