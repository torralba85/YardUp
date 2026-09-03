import { describe, expect, it } from "vitest";
import { defaultAduConfig, parcelPresets } from "./feasibility";
import { getAduPlacementBounds, getSiteFitCapacityStatus } from "./site-fit";

describe("getAduPlacementBounds", () => {
  it("uses the rear setback for the negative Z edge and front setback for positive Z", () => {
    const parcel = parcelPresets[0];
    const bounds = getAduPlacementBounds(parcel, defaultAduConfig);

    expect(bounds.minZ).toBe(
      -parcel.lotLength / 2 + parcel.setbacks.rear + defaultAduConfig.length / 2,
    );
    expect(bounds.maxZ).toBe(
      parcel.lotLength / 2 - parcel.setbacks.front - defaultAduConfig.length / 2,
    );
  });

  it("collapses an impossible envelope to a stable midpoint", () => {
    const parcel = { ...parcelPresets[0], lotWidth: 10 };
    const bounds = getAduPlacementBounds(parcel, defaultAduConfig);

    expect(bounds.minX).toBe(bounds.maxX);
    expect(bounds.minX).toBe(0);
  });
});

describe("getSiteFitCapacityStatus", () => {
  it("treats zero remaining capacity as within the modeled allowance", () => {
    expect(getSiteFitCapacityStatus(0)).toMatchObject({
      title: "0 sf of modeled coverage remains",
      tone: "ok",
    });
  });
});
