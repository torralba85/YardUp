import { describe, it, expect } from "vitest";
import { getIllustrativeSunPosition, formatPreviewHour, getLightingPreset, LIGHTING_PRESETS } from "./scene-lighting";

describe("scene-lighting", () => {
  it("clamps hours safely and returns finite coordinates", () => {
    const pos12 = getIllustrativeSunPosition(12);
    expect(pos12[0]).toBeCloseTo(0, 3);
    expect(pos12[1]).toBeCloseTo(75, 3);
    expect(pos12[2]).toBeCloseTo(55, 3);
    expect(getIllustrativeSunPosition(4)).toEqual(getIllustrativeSunPosition(7));
    expect(getIllustrativeSunPosition(25)).toEqual(getIllustrativeSunPosition(19));
    expect(getIllustrativeSunPosition(NaN)).toEqual(pos12);
  });

  it("formats half hours and whole hours accurately", () => {
    expect(formatPreviewHour(13.5)).toBe("1:30 PM");
    expect(formatPreviewHour(17.5)).toBe("5:30 PM");
    expect(formatPreviewHour(12)).toBe("12 PM");
    expect(formatPreviewHour(7)).toBe("7 AM");
    expect(formatPreviewHour(9.5)).toBe("9:30 AM");
    expect(formatPreviewHour(Number.NaN)).toBe("12 PM");
    expect(formatPreviewHour(3)).toBe("7 AM");
    expect(formatPreviewHour(23)).toBe("7 PM");
  });

  it("exports neutral inspection and golden hour presets", () => {
    expect(getLightingPreset("neutral").id).toBe("neutral");
    expect(getLightingPreset("golden-hour").sunColor).toBe("#ffd59e");
    expect(LIGHTING_PRESETS["golden-hour"]).toBeDefined();
  });
});
