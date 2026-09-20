import { describe, expect, it } from "vitest";
import { createSplatDepthFixture, DEFAULT_SPLAT_TRANSFORM, isValidSplatTransform, validateLocalSplat } from "./splat-scene";

describe("scan registration boundaries", () => {
  it("accepts uniform visual registration but rejects invalid coordinates and scales", () => {
    expect(isValidSplatTransform(DEFAULT_SPLAT_TRANSFORM)).toBe(true);
    for (const uniformScale of [0, -1, NaN, Infinity]) {
      expect(isValidSplatTransform({ ...DEFAULT_SPLAT_TRANSFORM, uniformScale })).toBe(false);
    }
    expect(isValidSplatTransform({ ...DEFAULT_SPLAT_TRANSFORM, positionFt: [0, NaN, 0] })).toBe(false);
    expect(isValidSplatTransform({ ...DEFAULT_SPLAT_TRANSFORM, yawRad: Infinity })).toBe(false);
  });

  it("bounds local decoding and accepts only supported scan extensions", () => {
    expect(validateLocalSplat({ name: "yard.SPZ", size: 100 })).toBeNull();
    for (const file of [{ name: "yard.zip", size: 100 }, { name: "yard.spz", size: 0 }, { name: "yard.spz", size: 33 * 1024 * 1024 }]) {
      expect(validateLocalSplat(file)).not.toBeNull();
    }
  });

  it("provides deterministic depth landmarks without sharing mutable buffers", () => {
    const first = createSplatDepthFixture();
    const second = createSplatDepthFixture();
    expect(first.bytes.length / 32).toBe(5106);
    const data = new DataView(first.bytes.buffer);
    expect(data.getFloat32(0, true)).toBe(-22);
    expect(data.getFloat32(first.bytes.length - 32, true)).toBe(22);
    expect(data.getFloat32(first.bytes.length - 28, true)).toBe(18);
    first.bytes.fill(0);
    expect(second.bytes.some((value) => value !== 0)).toBe(true);
  });
});
