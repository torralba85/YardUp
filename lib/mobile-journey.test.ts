import { describe, expect, it } from "vitest";
import {
  MOBILE_JOURNEY_STEPS,
  deriveJourneySteps,
  journeyIndex,
  nextJourneyStep,
  prevJourneyStep,
} from "./mobile-journey";

describe("mobile journey order", () => {
  it("walks the five reveals in order", () => {
    expect(MOBILE_JOURNEY_STEPS.map((s) => s.id)).toEqual([
      "find",
      "earn",
      "shape",
      "check",
      "act",
    ]);
    expect(nextJourneyStep("find")).toBe("earn");
    expect(nextJourneyStep("check")).toBe("act");
    expect(nextJourneyStep("act")).toBeNull();
    expect(prevJourneyStep("earn")).toBe("find");
    expect(prevJourneyStep("find")).toBeNull();
    expect(journeyIndex("shape")).toBe(2);
  });
});

describe("deriveJourneySteps", () => {
  it("locks everything past find until the find decision is made", () => {
    const steps = deriveJourneySteps("find", { found: false });
    expect(steps[0].state).toBe("current");
    expect(steps.slice(1).every((s) => s.state === "locked")).toBe(true);
  });

  it("marks earlier steps done and later steps upcoming once found", () => {
    const steps = deriveJourneySteps("check", { found: true });
    expect(steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "done",
      "current",
      "upcoming",
    ]);
  });
});
