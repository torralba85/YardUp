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

describe("haptics", () => {
  afterEach(() => {
    stubVibrate(undefined);
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

  it("defines a pattern for every event in the vocabulary", () => {
    const events: Array<keyof typeof HAPTIC_PATTERNS> = ["tap", "commit", "reveal"];
    for (const event of events) {
      expect(HAPTIC_PATTERNS[event]).toBeDefined();
    }
  });
});
