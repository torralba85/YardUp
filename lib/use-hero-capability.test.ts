import { describe, expect, it } from "vitest";
import { decideHeroMode } from "./use-hero-capability";

describe("decideHeroMode", () => {
  it("returns static when reduced motion is preferred", () => {
    expect(
      decideHeroMode({ reducedMotion: true, webgl: true, finePointer: true, wide: true }),
    ).toBe("static");
  });
  it("returns 2d on coarse pointer / narrow viewport even with webgl", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: false, wide: true }),
    ).toBe("2d");
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: true, wide: false }),
    ).toBe("2d");
  });
  it("returns 2d when webgl is unavailable", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: false, finePointer: true, wide: true }),
    ).toBe("2d");
  });
  it("returns 3d only when everything passes", () => {
    expect(
      decideHeroMode({ reducedMotion: false, webgl: true, finePointer: true, wide: true }),
    ).toBe("3d");
  });
});
