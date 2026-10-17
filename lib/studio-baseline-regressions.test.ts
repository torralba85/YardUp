import { describe, expect, test } from "vitest";
import { defaultScenarioState, parseScenarioParams, serializeScenarioParams } from "./scenario-url";
import { getAduPlacementBounds } from "./site-fit";
import type { Parcel } from "./parcel-types";

// Gemini T08 baseline, reviewed against the actual Parcel interface.
const parcel: Parcel = {
  address: "Synthetic demo", city: "Seattle", lotArea: 5000,
  lotWidth: 50, lotLength: 100, existingHouseSqft: 1380,
  maxLotCoveragePercent: 40, setbacks: { front: 20, rear: 10, side: 5 },
};
const scenario = (width: number, length: number) => ({
  ...defaultScenarioState,
  config: { ...defaultScenarioState.config, footprint: width * length, width, length },
});

describe("T08 baseline at 56293db: documented defects, not accepted behavior", () => {
  test.fails.each([[31, 20], [20, 31]])("U2: restores custom %i x %i dimensions", (width, length) => {
    const restored = parseScenarioParams(new URLSearchParams(serializeScenarioParams(scenario(width, length))));
    expect(restored.config).toMatchObject({ width, length, footprint: width * length });
  });
  test.fails("U2: equal-area designs retain different shapes", () => {
    expect(serializeScenarioParams(scenario(20, 31))).not.toBe(serializeScenarioParams(scenario(31, 20)));
  });
  test("D2 known-defect baseline: impossible X span collapses while Z still has room", () => {
    const tight = { ...parcel, lotWidth: 30, lotLength: 50, setbacks: { front: 10, rear: 10, side: 10 } };
    expect(20).toBeGreaterThan(tight.lotWidth - 2 * tight.setbacks.side);
    expect(getAduPlacementBounds(tight, { width: 20, length: 20 })).toEqual({ minX: 0, maxX: 0, minZ: -5, maxZ: 5 });
  });
});
