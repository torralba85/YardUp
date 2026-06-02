import { describe, expect, it } from "vitest";
import {
  clamp01,
  lerp,
  stageFromProgress,
  localStageProgress,
  formatHeroNumber,
  HERO_STAGES,
} from "./landing-stages";

describe("clamp01", () => {
  it("clamps below 0 and above 1", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});

describe("lerp", () => {
  it("interpolates endpoints and midpoint", () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});

describe("stageFromProgress", () => {
  it("maps progress to the four stages", () => {
    expect(stageFromProgress(0)).toBe("lot");
    expect(stageFromProgress(0.1)).toBe("lot");
    expect(stageFromProgress(0.3)).toBe("rise");
    expect(stageFromProgress(0.6)).toBe("numbers");
    expect(stageFromProgress(0.9)).toBe("report");
    expect(stageFromProgress(1)).toBe("report");
  });
});

describe("localStageProgress", () => {
  it("returns 0..1 within a stage's own band", () => {
    expect(localStageProgress(0.375, "rise")).toBeCloseTo(0.5, 5);
    expect(localStageProgress(0.25, "rise")).toBeCloseTo(0, 5);
    expect(localStageProgress(0.5, "rise")).toBeCloseTo(1, 5);
  });
  it("clamps outside the band", () => {
    expect(localStageProgress(0.1, "rise")).toBe(0);
    expect(localStageProgress(0.9, "rise")).toBe(1);
  });
});

describe("formatHeroNumber", () => {
  it("counts a currency value up by ratio with tabular formatting", () => {
    expect(formatHeroNumber(2350, 0, "currency")).toBe("$0");
    expect(formatHeroNumber(2350, 1, "currency")).toBe("$2,350");
    expect(formatHeroNumber(2350, 0.5, "currency")).toBe("$1,175");
  });
  it("formats plain numbers and suffixes", () => {
    expect(formatHeroNumber(9.8, 1, "years")).toBe("9.8 yrs");
    expect(formatHeroNumber(31, 1, "percent")).toBe("31%");
  });
});

describe("HERO_STAGES", () => {
  it("is contiguous and covers [0,1]", () => {
    expect(HERO_STAGES[0].start).toBe(0);
    expect(HERO_STAGES[HERO_STAGES.length - 1].end).toBe(1);
    for (let i = 1; i < HERO_STAGES.length; i++) {
      expect(HERO_STAGES[i].start).toBeCloseTo(HERO_STAGES[i - 1].end, 5);
    }
  });
});
