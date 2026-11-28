import { describe, expect, it } from "vitest";
import { aduPositionLabel } from "./adu-position-label";

describe("aduPositionLabel", () => {
  it("names distance along the lot toward the back or the street, never a compass bearing", () => {
    expect(aduPositionLabel({ x: 0, z: -28, rotationDeg: 0 })).toBe("28 ft toward the back");
    expect(aduPositionLabel({ x: 0, z: 12.4, rotationDeg: 0 })).toBe("12 ft toward the street");
  });

  it("adds a sideways offset and a turn only when there is one", () => {
    expect(aduPositionLabel({ x: -6, z: -20, rotationDeg: 90 })).toBe("20 ft toward the back, 6 ft to the side · turned 90°");
    expect(aduPositionLabel({ x: 0.2, z: 0.4, rotationDeg: 0 })).toBe("Centered on the lot");
  });
});
