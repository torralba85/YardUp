import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJourneyHistory, JOURNEY_STEP_STATE_KEY } from "./use-journey-history";
import type { MobileJourneyStep } from "./mobile-journey";

function popTo(step: MobileJourneyStep | null) {
  const event = new PopStateEvent("popstate", {
    state: step ? { [JOURNEY_STEP_STATE_KEY]: step } : null,
  });
  window.dispatchEvent(event);
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

    rerender({ step: "earn" });

    expect(push).toHaveBeenCalledTimes(1);
    const [state, , url] = push.mock.calls[0];
    expect(state).toMatchObject({ [JOURNEY_STEP_STATE_KEY]: "earn" });
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

    act(() => popTo("earn"));

    expect(onRestore).toHaveBeenCalledWith("earn");
  });

  it("does not push a new entry for a step arriving from popstate", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "shape" });

    const push = vi.spyOn(window.history, "pushState");
    act(() => popTo("earn"));
    // The consumer reacts to onRestore by setting state, which re-renders.
    rerender({ step: "earn" });

    expect(push).not.toHaveBeenCalled();
  });

  it("pushes again for a forward move that follows a popstate restore", () => {
    // Regression: handlePopState used to set syncedRef.current = restored
    // directly, which let the popstate-driven re-render's early-return guard
    // (`syncedRef.current === step`) fire before the restoringRef cleanup
    // branch ever ran, leaving restoringRef stuck true. The next distinct
    // forward move then wrongly took the "just restored" branch and silently
    // dropped its pushState.
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ step }: { step: MobileJourneyStep }) => useJourneyHistory(step, onRestore),
      { initialProps: { step: "find" as MobileJourneyStep } },
    );
    rerender({ step: "earn" });
    rerender({ step: "shape" });

    act(() => popTo("earn"));
    rerender({ step: "earn" });

    const push = vi.spyOn(window.history, "pushState");
    rerender({ step: "shape" });

    expect(push).toHaveBeenCalledTimes(1);
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
});
