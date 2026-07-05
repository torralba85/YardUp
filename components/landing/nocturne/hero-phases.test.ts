import { describe, expect, it } from "vitest";
import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  PHASES,
} from "@/remotion/nocturne/constants";
import {
  NOCTURNE_PARALLAX,
  SURVEY_RAIL,
  VERDICT_LANDED_AT,
  activeRailPhase,
  nocturneParallax,
} from "./hero-phases";

describe("nocturne hero phases", () => {
  it("derives one rail entry per survey phase plus the opening beat", () => {
    expect(SURVEY_RAIL.map((entry) => entry.id)).toEqual([
      "open",
      "boundary",
      "setbacks",
      "cast",
      "verdict",
    ]);
  });

  it("keeps rail fractions in sync with the composition's frame ranges", () => {
    const boundary = SURVEY_RAIL.find((entry) => entry.id === "boundary")!;
    expect(boundary.until).toBeCloseTo(
      PHASES.boundary.end / BLUE_HOUR_DURATION_IN_FRAMES,
    );
    expect(boundary.target).toBeLessThan(boundary.until);
    const verdict = SURVEY_RAIL.find((entry) => entry.id === "verdict")!;
    expect(verdict.until).toBeGreaterThanOrEqual(1);
  });

  it("orders rail entries monotonically and keeps targets inside [0, 1]", () => {
    for (let i = 1; i < SURVEY_RAIL.length; i += 1) {
      expect(SURVEY_RAIL[i].until).toBeGreaterThan(SURVEY_RAIL[i - 1].until);
    }
    SURVEY_RAIL.forEach((entry) => {
      expect(entry.target).toBeGreaterThanOrEqual(0);
      expect(entry.target).toBeLessThanOrEqual(1);
    });
  });

  it("resolves the active phase from scroll progress", () => {
    expect(activeRailPhase(0).id).toBe("open");
    expect(activeRailPhase(0.5).id).toBe("setbacks");
    expect(activeRailPhase(1).id).toBe("verdict");
    expect(activeRailPhase(1.2).id).toBe("verdict");
  });

  it("lands the verdict handoff after the plate has counted up", () => {
    expect(VERDICT_LANDED_AT).toBeGreaterThan(0.9);
    expect(VERDICT_LANDED_AT).toBeLessThan(1);
  });

  it("clamps parallax offsets to the configured amplitude", () => {
    expect(nocturneParallax(0, 0)).toEqual({ x: 0, y: 0 });
    const extreme = nocturneParallax(5, -5);
    expect(extreme.x).toBeCloseTo(NOCTURNE_PARALLAX.x);
    expect(extreme.y).toBeCloseTo(NOCTURNE_PARALLAX.y);
    const opposite = nocturneParallax(-0.5, 0.5);
    expect(opposite.x).toBeCloseTo(-NOCTURNE_PARALLAX.x * 0.5);
    expect(opposite.y).toBeCloseTo(-NOCTURNE_PARALLAX.y * 0.5);
  });
});
