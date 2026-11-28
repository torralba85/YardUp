import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJourneyHistory, JOURNEY_STEP_STATE_KEY } from "./use-journey-history";
import type { MobileJourneyStep } from "./mobile-journey";

function popTo(step: MobileJourneyStep | null) {
  const state = step ? { [JOURNEY_STEP_STATE_KEY]: step } : null;
  // A real popstate only ever fires after the browser has already moved to
  // the destination entry, so `history.state` reflects it by the time the
  // event handler runs. Stamp that here so the synthetic event matches real
  // navigation instead of only setting `event.state` — the hook's sync
  // effect now reads `history.state` directly (see use-journey-history.ts),
  // so a synthetic popstate that left it stale would desync the test double
  // from what a real back/forward press actually does.
  window.history.replaceState(state, "", window.location.href);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

describe("useJourneyHistory", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/studio");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces rather than pushes on the first sync, so the journey adds no entry at launch", () => {
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");

    renderHook(() => useJourneyHistory("find", vi.fn()));

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("pushes one entry per forward move without changing the URL", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, vi.fn()),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );

    rerender({ step: "check" });

    expect(push).toHaveBeenCalledTimes(1);
    const [state, , url] = push.mock.calls[0];
    expect(state).toMatchObject({ [JOURNEY_STEP_STATE_KEY]: "check" });
    // Privacy rule (e2e/hero.spec.ts:61): a guest's address must never
    // reach the URL or history. Entries reuse the current URL exactly.
    expect(url).toBe(window.location.href);
  });

  it("restores the step carried by a popstate event", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "shape" });

    act(() => popTo("check"));

    expect(onRestore).toHaveBeenCalledWith("check");
  });

  it("does not push a new entry for a step arriving from popstate", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "shape" });

    const push = vi.spyOn(window.history, "pushState");
    act(() => popTo("check"));
    // The consumer reacts to onRestore by setting state, which re-renders.
    rerender({ step: "check" });

    expect(push).not.toHaveBeenCalled();
  });

  it("pushes again for a forward move that follows a popstate restore", () => {
    // Regression: handlePopState used to set a restoringRef flag directly,
    // which the sync effect cleared only on the re-render that adopted the
    // restored step. That flag mechanism is gone now (see the next test for
    // the case that broke it) — the sync effect instead compares the pending
    // step against `history.state` itself on every run, so it always makes
    // the right call for whichever step it is asked to sync, restore or not.
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "check" });
    rerender({ step: "shape" });

    act(() => popTo("check"));
    rerender({ step: "check" });

    const push = vi.spyOn(window.history, "pushState");
    rerender({ step: "shape" });

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("still pushes the next forward move when the consumer refuses a popstate restore", () => {
    // This is the scenario that actually broke the old restoringRef flag:
    // FeasibilityStudio's reachability guard (Requirement A) can look at a
    // restored step, decide it is not reachable, and simply not call
    // setJourneyStep — so `step` never changes in response to onRestore.
    // The old flag was only ever cleared by the sync effect's "just
    // restored" branch, which only ran on a render where `step` had changed
    // to match the restore. A refusal meant that branch never ran, so the
    // flag stayed stuck true and silently ate the next real forward push.
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "check" });
    rerender({ step: "shape" });

    // popstate delivers "check", but the consumer refuses it — no rerender
    // follows, so `step` (from the hook's point of view) stays "shape".
    act(() => popTo("check"));
    expect(onRestore).toHaveBeenCalledWith("check");

    const push = vi.spyOn(window.history, "pushState");
    // A genuine forward move to a different step still occurs afterward.
    rerender({ step: "act" });

    expect(push).toHaveBeenCalledTimes(1);
    const [state] = push.mock.calls[0];
    expect(state).toMatchObject({ [JOURNEY_STEP_STATE_KEY]: "act" });
  });

  it("ignores a popstate entry with no journey state", () => {
    // CertificatePanel.tsx:135 calls replaceState and can drop our key.
    // A missing key must never be interpreted as a step change.
    const onRestore = vi.fn();
    renderHook(() => useJourneyHistory("shape", onRestore));

    act(() => popTo(null));

    expect(onRestore).not.toHaveBeenCalled();
  });

  it("reset() calls replaceState once and never pushState", () => {
    const { result, rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, vi.fn()),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "act" });

    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    act(() => result.current.reset());
    rerender({ step: "find" });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("does nothing while disabled: no replaceState, no pushState, popstate never reaches onRestore", () => {
    // Desktop passes enabled: !isDesktop (always false on desktop). Desktop
    // must not observe any side effect of this hook at all — not even the
    // "first sync" replaceState a mount normally performs.
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore, false),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "check" });

    // Dispatched directly rather than via the shared popTo() helper: popTo
    // also calls replaceState to model realistic browser semantics for the
    // *other* tests, which would itself show up on the `replace` spy and
    // confound this assertion. This test's own point is that the disabled
    // hook never even attaches a popstate listener, so history.state's
    // actual contents don't matter here.
    act(() => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { [JOURNEY_STEP_STATE_KEY]: "shape" } }),
      );
    });

    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it("performs a correct first replaceState (not a push) once re-enabled, even after steps changed while disabled", () => {
    // The hook must leave syncedRef untouched while disabled so that
    // enabling later (e.g. useMediaQuery correcting from its SSR default to
    // the real mobile viewport) still looks like a first sync, not a
    // forward move needing a push. Exercise this with a step change that
    // happens entirely while disabled, matching the real isDesktop-flips-
    // after-hydration sequence.
    const { rerender } = renderHook(
      ({ step, enabled }: { step: MobileJourneyStep; enabled: boolean }) =>
        useJourneyHistory(step, vi.fn(), enabled),
      { initialProps: { step: "find" as MobileJourneyStep, enabled: false } },
    );
    rerender({ step: "check", enabled: false });

    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    rerender({ step: "check", enabled: true });

    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
