import { describe, expect, it } from "vitest";
import {
  MOBILE_JOURNEY_STEPS,
  deriveJourneySteps,
  journeyIndex,
  nextJourneyStep,
  prevJourneyStep,
  type MobileJourneyStep,
} from "./mobile-journey";
import { STUDIO_STEPS } from "./studio-steps";

describe("mobile journey order", () => {
  it("walks the five reveals in order", () => {
    expect(MOBILE_JOURNEY_STEPS.map((s) => s.id)).toEqual([
      "find",
      "check",
      "shape",
      "act",
      "builders",
    ]);
    expect(nextJourneyStep("find")).toBe("check");
    expect(nextJourneyStep("act")).toBe("builders");
    expect(nextJourneyStep("builders")).toBeNull();
    expect(prevJourneyStep("check")).toBe("find");
    expect(prevJourneyStep("find")).toBeNull();
    expect(journeyIndex("shape")).toBe(2);
  });

  it("uses the desktop step names in the desktop order", () => {
    // One journey on every device (2026-11-27 UX audit, Andrew's decision).
    expect(MOBILE_JOURNEY_STEPS.map((s) => s.label)).toEqual(STUDIO_STEPS.map((s) => s.label));
  });
});

describe("deriveJourneySteps", () => {
  it("locks everything past find until the find decision is made", () => {
    const steps = deriveJourneySteps("find", { found: false });
    expect(steps[0].state).toBe("current");
    expect(steps.slice(1).every((s) => s.state === "locked")).toBe(true);
  });

  it("marks earlier steps done and later steps upcoming once found", () => {
    const steps = deriveJourneySteps("act", { found: true });
    expect(steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("shows a Certificate passed without buying as viewed, not done", () => {
    const steps = deriveJourneySteps("builders", {
      found: true,
      completed: new Set<MobileJourneyStep>(["find", "check", "shape"]),
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "viewed", "current"]);
  });
});
