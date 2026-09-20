import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ellipsoidalToMslMeters,
  formatGroundElevation,
  geoidHeightMeters,
  isGeoidReady,
  metersToFeet,
  orthometricToEllipsoidal,
  resetGeoidForTesting,
  setGeoidModuleForTesting,
} from "./geoid";

/** San Francisco's undulation, the case that reads as below sea level uncorrected. */
const SF_UNDULATION_M = -32.2;

afterEach(() => {
  resetGeoidForTesting();
});

describe("geoidHeightMeters", () => {
  it("returns null until the grid is loaded, so callers branch instead of catching", () => {
    expect(isGeoidReady()).toBe(false);
    expect(geoidHeightMeters(37.7749, -122.4194)).toBeNull();
  });

  it("returns the undulation once the grid is available", () => {
    setGeoidModuleForTesting({ meanSeaLevel: () => SF_UNDULATION_M });
    expect(isGeoidReady()).toBe(true);
    expect(geoidHeightMeters(37.7749, -122.4194)).toBe(SF_UNDULATION_M);
  });

  it("rejects non-finite coordinates and non-finite grid answers", () => {
    setGeoidModuleForTesting({ meanSeaLevel: () => Number.NaN });
    expect(geoidHeightMeters(37.7749, -122.4194)).toBeNull();
    setGeoidModuleForTesting({ meanSeaLevel: () => 10 });
    expect(geoidHeightMeters(Number.NaN, -122.4194)).toBeNull();
  });
});

describe("orthometricToEllipsoidal", () => {
  it("adds the undulation: h = H + N", () => {
    setGeoidModuleForTesting({ meanSeaLevel: () => SF_UNDULATION_M });
    expect(orthometricToEllipsoidal(100, 37.7749, -122.4194)).toBeCloseTo(67.8, 6);
  });

  it("returns null rather than an unconverted height when the grid is missing", () => {
    expect(orthometricToEllipsoidal(100, 37.7749, -122.4194)).toBeNull();
  });

  it("returns null for a non-finite input height", () => {
    setGeoidModuleForTesting({ meanSeaLevel: () => SF_UNDULATION_M });
    expect(orthometricToEllipsoidal(Number.NaN, 37.7749, -122.4194)).toBeNull();
  });
});

describe("ellipsoidalToMslMeters", () => {
  it("subtracts the undulation: H = h - N", () => {
    // A San Francisco lot sampled at -15 m ellipsoidal is really ~17 m above sea level.
    expect(ellipsoidalToMslMeters(-15, SF_UNDULATION_M)).toBeCloseTo(17.2, 6);
  });

  it("degrades to the uncorrected height when the undulation is unknown", () => {
    expect(ellipsoidalToMslMeters(-15, null)).toBe(-15);
    expect(ellipsoidalToMslMeters(-15, Number.NaN)).toBe(-15);
  });

  it("passes a non-finite height straight through", () => {
    expect(ellipsoidalToMslMeters(Number.NaN, SF_UNDULATION_M)).toBeNaN();
  });
});

describe("metersToFeet", () => {
  it("uses the exact international foot", () => {
    expect(metersToFeet(0.3048)).toBeCloseTo(1, 10);
    expect(metersToFeet(100)).toBeCloseTo(328.0839895, 6);
  });
});

describe("formatGroundElevation", () => {
  it("reports whole feet above sea level and flags the correction as applied", () => {
    expect(formatGroundElevation(-15, SF_UNDULATION_M)).toEqual({ feet: 56, corrected: true });
  });

  it("flags an uncorrected reading so it is not labelled as sea level", () => {
    expect(formatGroundElevation(-15, null)).toEqual({ feet: -49, corrected: false });
  });

  it("returns no elevation when the ground was never measured", () => {
    expect(formatGroundElevation(null, SF_UNDULATION_M)).toEqual({ feet: null, corrected: false });
  });
});

describe("ensureGeoidReady", () => {
  it("resolves rather than rejecting when the lazy grid import fails", async () => {
    resetGeoidForTesting();
    vi.doMock("egm96-universal", () => {
      throw new Error("chunk load failed");
    });
    const { ensureGeoidReady: reimported, isGeoidReady: readyCheck } = await import("./geoid");

    await expect(reimported()).resolves.toBeUndefined();
    expect(readyCheck()).toBe(false);

    vi.doUnmock("egm96-universal");
    vi.resetModules();
  });
});
