import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeEntrySource, stashEntrySource } from "./entry-source";

describe("entry-source attribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns unknown when no source was stashed", () => {
    expect(consumeEntrySource()).toBe("unknown");
  });

  it("stashes and consumes landing_cta exactly once", () => {
    stashEntrySource("landing_cta");
    expect(consumeEntrySource()).toBe("landing_cta");
    // Consumed: subsequent call returns unknown
    expect(consumeEntrySource()).toBe("unknown");
  });

  it("stashes and consumes shared_link", () => {
    stashEntrySource("shared_link");
    expect(consumeEntrySource()).toBe("shared_link");
    expect(consumeEntrySource()).toBe("unknown");
  });

  it("expires after 5 minutes", () => {
    vi.useFakeTimers();
    stashEntrySource("landing_cta");

    // Advance 5 minutes + 1 second
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

    expect(consumeEntrySource()).toBe("unknown");
    vi.useRealTimers();
  });
});
