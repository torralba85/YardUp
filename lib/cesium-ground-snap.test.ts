import { describe, expect, it, vi } from "vitest";
import {
  GROUND_SNAP_BASE_DELAY_MS,
  GROUND_SNAP_MAX_DELAY_MS,
  GROUND_SNAP_MAX_PLAUSIBLE_M,
  GROUND_SNAP_MIN_PLAUSIBLE_M,
  GROUND_SNAP_REFINE_THRESHOLD_M,
  groundSnapDelayMs,
  isPlausibleGroundHeight,
  sampleGroundHeight,
  shouldRefineGround,
  type GroundSnapCesiumModule,
} from "./cesium-ground-snap";

const Cesium: GroundSnapCesiumModule = {
  Cartographic: { fromDegrees: (lng, lat, height) => ({ lng, lat, height }) },
};

/** Collects the backoff delays instead of waiting them out. */
function makeWaitSpy() {
  const delays: number[] = [];
  return {
    delays,
    wait: async (ms: number) => {
      delays.push(ms);
    },
  };
}

describe("groundSnapDelayMs", () => {
  it("doubles from the base delay and caps", () => {
    expect(groundSnapDelayMs(0)).toBe(GROUND_SNAP_BASE_DELAY_MS);
    expect(groundSnapDelayMs(1)).toBe(GROUND_SNAP_BASE_DELAY_MS * 2);
    expect(groundSnapDelayMs(20)).toBe(GROUND_SNAP_MAX_DELAY_MS);
  });
});

describe("isPlausibleGroundHeight", () => {
  it("accepts heights the Earth's surface actually reaches", () => {
    expect(isPlausibleGroundHeight(0)).toBe(true);
    expect(isPlausibleGroundHeight(1608.2)).toBe(true);
    expect(isPlausibleGroundHeight(GROUND_SNAP_MIN_PLAUSIBLE_M)).toBe(true);
    expect(isPlausibleGroundHeight(GROUND_SNAP_MAX_PLAUSIBLE_M)).toBe(true);
  });

  it("rejects a decoded far-plane depth, the measured OSM-globe failure", () => {
    // The real value observed in this Studio against flat OSM imagery.
    expect(isPlausibleGroundHeight(-44700)).toBe(false);
    expect(isPlausibleGroundHeight(1e9)).toBe(false);
  });

  it("rejects undefined and non-finite samples", () => {
    expect(isPlausibleGroundHeight(undefined)).toBe(false);
    expect(isPlausibleGroundHeight(Number.NaN)).toBe(false);
    expect(isPlausibleGroundHeight(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("shouldRefineGround", () => {
  it("refines only past the visible-movement threshold", () => {
    expect(shouldRefineGround(100, 100 + GROUND_SNAP_REFINE_THRESHOLD_M + 0.5)).toBe(true);
    expect(shouldRefineGround(100, 100.2)).toBe(false);
  });

  it("treats a first measurement as worth applying, and a missing refinement as not", () => {
    expect(shouldRefineGround(null, 180)).toBe(true);
    expect(shouldRefineGround(180, null)).toBe(false);
  });
});

describe("sampleGroundHeight", () => {
  it("returns the first successful measurement without waiting", async () => {
    const { wait, delays } = makeWaitSpy();
    const scene = { sampleHeight: vi.fn(() => 182.4), sampleHeightSupported: true };

    const result = await sampleGroundHeight(30.2672, -97.7431, { scene, Cesium }, { wait });

    expect(result).toEqual({ status: "measured", heightMeters: 182.4, attempts: 1 });
    expect(delays).toEqual([]);
  });

  it("retries with backoff while tiles are still streaming, then succeeds", async () => {
    const { wait, delays } = makeWaitSpy();
    const sampleHeight = vi
      .fn<(position: unknown, objectsToExclude?: unknown[]) => number | undefined>()
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValue(1608.2);
    const scene = { sampleHeight, sampleHeightSupported: true };

    const result = await sampleGroundHeight(39.7392, -104.9903, { scene, Cesium }, { wait });

    expect(result.status).toBe("measured");
    expect(result.heightMeters).toBe(1608.2);
    expect(result.attempts).toBe(3);
    expect(delays).toEqual([GROUND_SNAP_BASE_DELAY_MS, GROUND_SNAP_BASE_DELAY_MS * 2]);
  });

  it("reports cold after exhausting attempts, and does not wait after the last one", async () => {
    const { wait, delays } = makeWaitSpy();
    const scene = { sampleHeight: vi.fn(() => undefined), sampleHeightSupported: true };

    const result = await sampleGroundHeight(0, 0, { scene, Cesium }, { wait, maxAttempts: 3 });

    expect(result).toEqual({ status: "cold", heightMeters: null, attempts: 3 });
    expect(delays).toHaveLength(2);
  });

  it("reports unsupported without sampling where the platform cannot pick depth", async () => {
    const sampleHeight = vi.fn(() => 100);
    const scene = { sampleHeight, sampleHeightSupported: false };

    const result = await sampleGroundHeight(1, 1, { scene, Cesium });

    expect(result).toEqual({ status: "unsupported", heightMeters: null, attempts: 0 });
    expect(sampleHeight).not.toHaveBeenCalled();
  });

  it("treats a throwing sample as a miss rather than propagating", async () => {
    const { wait } = makeWaitSpy();
    const scene = {
      sampleHeight: vi.fn(() => {
        throw new Error("scene tearing down");
      }),
      sampleHeightSupported: true,
    };

    const result = await sampleGroundHeight(1, 1, { scene, Cesium }, { wait, maxAttempts: 2 });

    expect(result.status).toBe("cold");
    expect(result.attempts).toBe(2);
  });

  it("stops retrying once cancelled, so unmounting ends the work", async () => {
    const { wait } = makeWaitSpy();
    let cancelled = false;
    const sampleHeight = vi.fn(() => {
      cancelled = true;
      return undefined;
    });
    const scene = { sampleHeight, sampleHeightSupported: true };

    const result = await sampleGroundHeight(
      1,
      1,
      { scene, Cesium },
      { wait, maxAttempts: 6, isCancelled: () => cancelled },
    );

    expect(sampleHeight).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("cold");
  });

  it("forwards excluded objects so our own ADU box is never measured", async () => {
    const sampleHeight = vi.fn(() => 12);
    const scene = { sampleHeight, sampleHeightSupported: true };
    const aduEntity = { name: "Proposed ADU Footprint" };

    await sampleGroundHeight(1, 1, { scene, Cesium }, { objectsToExclude: [aduEntity] });

    expect(sampleHeight).toHaveBeenCalledWith(expect.anything(), [aduEntity]);
  });

  it("treats an absurd height as a miss and retries instead of reporting it", async () => {
    const { wait, delays } = makeWaitSpy();
    // The flat-OSM-globe failure: a finite number that is not a ground height,
    // followed by a real one once imagery has loaded.
    const sampleHeight = vi
      .fn<(position: unknown, objectsToExclude?: unknown[]) => number | undefined>()
      .mockReturnValueOnce(-44700)
      .mockReturnValue(56);
    const scene = { sampleHeight, sampleHeightSupported: true };

    const result = await sampleGroundHeight(47.6062, -122.3321, { scene, Cesium }, { wait });

    expect(result).toEqual({ status: "measured", heightMeters: 56, attempts: 2 });
    expect(delays).toEqual([GROUND_SNAP_BASE_DELAY_MS]);
  });

  it("reports cold when every sample is absurd, rather than a 44 km hole", async () => {
    const { wait } = makeWaitSpy();
    const scene = { sampleHeight: vi.fn(() => -44700), sampleHeightSupported: true };

    const result = await sampleGroundHeight(47.6062, -122.3321, { scene, Cesium }, { wait, maxAttempts: 3 });

    expect(result).toEqual({ status: "cold", heightMeters: null, attempts: 3 });
  });

  it("rejects non-finite coordinates without sampling", async () => {
    const sampleHeight = vi.fn(() => 5);
    const result = await sampleGroundHeight(Number.NaN, 0, {
      scene: { sampleHeight, sampleHeightSupported: true },
      Cesium,
    });

    expect(result.status).toBe("cold");
    expect(sampleHeight).not.toHaveBeenCalled();
  });
});
