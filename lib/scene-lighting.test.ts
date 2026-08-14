import { describe, expect, it } from "vitest";
import { formatPreviewHour, getIllustrativeSunPosition } from "./scene-lighting";

describe("scene lighting preview", () => {
  it("places the noon light at the top of the illustrative arc", () => {
    const [x, y, z] = getIllustrativeSunPosition(12);

    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(75);
    expect(z).toBeCloseTo(55);
  });

  it("clamps invalid and out-of-range hours", () => {
    expect(getIllustrativeSunPosition(Number.NaN)).toEqual(
      getIllustrativeSunPosition(12),
    );
    expect(getIllustrativeSunPosition(3)).toEqual(
      getIllustrativeSunPosition(7),
    );
    expect(getIllustrativeSunPosition(23)).toEqual(
      getIllustrativeSunPosition(19),
    );
  });

  it("formats whole and half-hour labels", () => {
    expect(formatPreviewHour(7)).toBe("7 AM");
    expect(formatPreviewHour(12)).toBe("12 PM");
    expect(formatPreviewHour(13.5)).toBe("1.5 PM");
    expect(formatPreviewHour(Number.NaN)).toBe("12 PM");
  });
});
