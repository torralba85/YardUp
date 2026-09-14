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

  it("exports the gallery daylight and shadow preview presets, not the retired golden hour", () => {
    expect(getLightingPreset("neutral").name).toBe("Gallery Daylight");
    expect(getLightingPreset("shadow-preview").name).toBe("Shadow Preview");
    expect(Object.keys(LIGHTING_PRESETS)).toEqual(["neutral", "shadow-preview"]);
  });

  it("lights every preset with neutral A LOT MORE colours only", () => {
    const neutrals = ["#FFFFFF", "#F5F5F0", "#DADAD3"];
    for (const preset of Object.values(LIGHTING_PRESETS)) {
      for (const color of [preset.sunColor, preset.ambientColor, preset.fillColor]) {
        expect(neutrals, `${preset.id} ${color}`).toContain(color.toUpperCase());
      }
    }
  });
});
