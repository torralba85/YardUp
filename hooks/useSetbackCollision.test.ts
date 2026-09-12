import { describe, expect, it } from "vitest";
import type { Parcel } from "../lib/parcel-types";
import { evaluateSetbackCollision, snapPoseToSetbackEnvelope } from "./useSetbackCollision";

const parcel: Parcel = {
  address: "Test lot",
  city: "San Diego, CA 92101",
  lotArea: 2400,
  lotWidth: 40,
  lotLength: 60,
  existingHouseSqft: 0,
  maxLotCoveragePercent: 50,
  setbacks: { front: 10, rear: 4, side: 4 },
};
const config = { width: 10, length: 10 };

describe("useSetbackCollision helpers", () => {
  it("flags an ADU that crosses the side setback", () => {
    const result = evaluateSetbackCollision(parcel, config, { x: 12, z: 0, rotationDeg: 0 });
    expect(result.isSetbackViolated).toBe(true);
    expect(result.placement.envelopeStatus).toBe("overflow");
  });

  it("snaps a near miss back to the legal boundary", () => {
    const snapped = snapPoseToSetbackEnvelope(
      parcel,
      config,
      { x: 11.25, z: 0, rotationDeg: 0 },
      0.5,
    );
    expect(snapped?.x).toBeCloseTo(11);
    expect(snapped?.z).toBe(0);
    expect(evaluateSetbackCollision(parcel, config, snapped!).placement.envelopeStatus).toBe("fits");
  });

  it("does not hide a larger violation", () => {
    expect(
      snapPoseToSetbackEnvelope(parcel, config, { x: 12, z: 0, rotationDeg: 0 }, 0.5),
    ).toBeNull();
  });
});
