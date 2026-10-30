import { afterEach, describe, expect, it, vi } from "vitest";
import { findBestFitPose } from "./placement-search";
import { rectangleCorners } from "./scene-model";
import { validatePlacement, type PlacementInput } from "./placement-validation";
import * as placement from "./placement-validation";

const input: PlacementInput = {
  aduWidth: 20, aduLength: 30, pose: { x: 0, z: 10, rotationDeg: 0 },
  envelope: rectangleCorners({ x: 0, z: 0 }, 30, 100, 0),
  existingHouseCorners: rectangleCorners({ x: 0, z: 15 }, 30, 40, 0),
};

afterEach(() => vi.restoreAllMocks());

describe("findBestFitPose", () => {
  it("finds the nearest fit without exhaustively validating farther candidates", () => {
    const validate = vi.spyOn(placement, "validatePlacement");
    const concave = { ...input, envelope: [
      { x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: -20 },
      { x: -10, z: -20 }, { x: -10, z: 50 }, { x: -50, z: 50 },
    ] };
    expect(findBestFitPose(concave)).toEqual({ x: -35, z: 10, rotationDeg: 0 });
    // Deterministic work budget, independent of CPU speed. The unpruned
    // search checks 1,542 poses for this envelope, including its distant arm.
    expect(validate.mock.calls.length).toBeLessThan(1200);
  });

  it("stops after diagnosing an invalid envelope that moving cannot repair", () => {
    const validate = vi.spyOn(placement, "validatePlacement");
    expect(findBestFitPose({ ...input, envelope: [
      { x: -50, z: -50 }, { x: 50, z: 50 },
      { x: -50, z: 50 }, { x: 50, z: -50 },
    ] })).toBeNull();
    expect(validate).toHaveBeenCalledTimes(1);
  });

  it("rotates and moves out of a house collision without changing the footprint", () => {
    expect(validatePlacement(input).status).toBe("blocked");
    const pose = findBestFitPose(input);
    expect(pose?.rotationDeg).toBe(90);
    expect(validatePlacement({ ...input, pose: pose! }).status).toBe("fits");
    expect(findBestFitPose(input)).toEqual(pose);
  });
  it("preserves an already fitting pose", () => {
    const pose = findBestFitPose(input)!;
    expect(findBestFitPose({ ...input, pose })).toEqual(pose);
  });
  it("returns no solution for unknown obstacles, invalid data, and an oversized footprint", () => {
    expect(findBestFitPose({ ...input, existingHouseCorners: null })).toBeNull();
    expect(findBestFitPose({ ...input, aduWidth: NaN })).toBeNull();
    expect(findBestFitPose({ ...input, pose: { ...input.pose, x: NaN } })).toBeNull();
    expect(findBestFitPose({ ...input, aduWidth: 200 })).toBeNull();
  });
  it("checks a concave envelope with the canonical validator", () => {
    const concave = { ...input, envelope: [
      { x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: -20 },
      { x: -10, z: -20 }, { x: -10, z: 50 }, { x: -50, z: 50 },
    ] };
    const pose = findBestFitPose(concave);
    expect(pose).not.toBeNull();
    expect(validatePlacement({ ...concave, pose: pose! }).status).toBe("fits");
  });
});
