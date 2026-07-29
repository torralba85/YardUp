import { afterEach, describe, expect, it, vi } from "vitest";
import { canVibrate, haptic, HAPTIC_PATTERNS } from "./haptics";

function stubVibrate(fn: ((pattern: number | number[]) => boolean) | undefined) {
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: fn,
  });
}

function stubReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: reduce,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

function restoreMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe("haptics", () => {
  afterEach(() => {
    stubVibrate(undefined);
    restoreMatchMedia();
    vi.restoreAllMocks();
  });

  it("reports no capability where navigator.vibrate is absent (iOS)", () => {
    stubVibrate(undefined);
    expect(canVibrate()).toBe(false);
  });

  it("reports capability where navigator.vibrate exists (Android Chrome)", () => {
    stubVibrate(vi.fn(() => true));
    expect(canVibrate()).toBe(true);
  });

  it("no-ops silently without capability rather than throwing", () => {
    stubVibrate(undefined);
    stubReducedMotion(false);
    expect(() => haptic("commit")).not.toThrow();
  });

  it("fires the pattern registered for the event", () => {
    const vibrate = vi.fn(() => true);
    stubVibrate(vibrate);
    stubReducedMotion(false);

    haptic("commit");

    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.commit);
  });

  it("stays silent when the user prefers reduced motion", () => {
    const vibrate = vi.fn(() => true);
    stubVibrate(vibrate);
    stubReducedMotion(true);

    haptic("commit");

    expect(vibrate).not.toHaveBeenCalled();
  });

  it("fires despite incomplete matchMedia polyfill returning undefined", () => {
    const vibrate = vi.fn(() => true);
    stubVibrate(vibrate);
    // matchMedia exists as a function but returns undefined (broken polyfill)
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => undefined),
    });

    expect(() => haptic("commit")).not.toThrow();
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.commit);
  });

  it("defines a pattern for every event in the vocabulary", () => {
    const events: Array<keyof typeof HAPTIC_PATTERNS> = ["tap", "commit", "reveal"];
    for (const event of events) {
      expect(HAPTIC_PATTERNS[event]).toBeDefined();
    }
  });

  it("does not throw when navigator.vibrate itself throws when invoked (Requirement D)", () => {
    // Permission errors and buggy WebView shims can make the call itself
    // throw, not just be absent. haptic() is wired into Button's onClick,
    // so a throw here would abort the click handler and the CTA's real
    // action would never run — haptics must never be a hard dependency.
    stubVibrate(
      vi.fn(() => {
        throw new Error("vibrate permission denied");
      }),
    );
    stubReducedMotion(false);

    expect(() => haptic("commit")).not.toThrow();
  });
});
