import { describe, expect, it } from "vitest";
import { buildSetbackEnvelope, validatePlacement, type PlacementInput } from "./placement-validation";
import { rectangleCorners } from "./scene-model";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";
import { summarizeFeasibility } from "./feasibility-verdict";

const pose = { x: 0, z: 0, rotationDeg: 0 };
const base: PlacementInput = { aduWidth: 20, aduLength: 20, pose,
  envelope: buildSetbackEnvelope(40, 60, { side: 5, front: 5, rear: 5 }),
  existingHouseCorners: rectangleCorners({ x: 0, z: 50 }, 10, 10) };
describe("actual placement contract", () => {
  it("accepts exact boundary fit but rejects a one-inch overflow", () => {
    expect(validatePlacement({ ...base, aduWidth: 30 }).status).toBe("fits");
    expect(validatePlacement({ ...base, aduWidth: 30 + 1 / 12 }).envelopeStatus).toBe("overflow");
  });
  it("does not promote the displayed 31x20 pose when a 90 degree alternative fits", () => {
    const result = validatePlacement({ ...base, aduWidth: 31 });
    expect(result.status).toBe("blocked");
    expect(result.rotatedAlternative?.recommended).toBe(true);
    expect(validatePlacement({ ...base, aduWidth: 31, pose: { ...pose, rotationDeg: 90 } }).status).toBe("fits");
  });
  it("keeps coverage separate from a house collision", () => {
    const placement = validatePlacement({ ...base, existingHouseCorners: rectangleCorners(pose, 12, 12) });
    expect(placement.houseStatus).toBe("overlap");
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
    expect(result.remainingCapacity).toBeGreaterThanOrEqual(0);
    const summary = summarizeFeasibility(parcel, result, defaultAduConfig, placement);
    expect(summary.verdict).toBe("Needs Review");
    expect(summary.constraints.find(row => row.id === "placement")?.status).toBe("blocked");
  });
  it("distinguishes contact, unknown obstacles, and clear ground", () => {
    expect(validatePlacement({ ...base, existingHouseCorners: rectangleCorners({ x: 15, z: 0 }, 10, 10) }).houseStatus).toBe("boundary-contact");
    expect(validatePlacement({ ...base, existingHouseCorners: null }).status).toBe("review");
    expect(validatePlacement({ ...base, existingHouseCorners: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }] }).houseStatus).toBe("unknown");
  });
  it("rejects empty envelopes, invalid tolerance, and overflowing numeric products", () => {
    expect(validatePlacement({ ...base, envelope: buildSetbackEnvelope(20, 20, { side: 15, front: 15, rear: 15 }) }).envelopeStatus).toBe("empty");
    expect(validatePlacement({ ...base, envelope: null }).status).toBe("invalid");
    for (const toleranceFt of [NaN, Infinity, -1]) expect(validatePlacement({ ...base, toleranceFt }).status).toBe("invalid");
    expect(validatePlacement({ ...base, aduWidth: 1e308 }).status).toBe("invalid");
  });
  it("detects a concave notch even when every ADU corner is inside", () => {
    const envelope = [{ x: -20, z: -20 }, { x: 20, z: -20 }, { x: 20, z: 20 }, { x: 3, z: 20 }, { x: 3, z: -3 }, { x: -3, z: -3 }, { x: -3, z: 20 }, { x: -20, z: 20 }];
    expect(validatePlacement({ ...base, envelope }).envelopeStatus).toBe("overflow");
    // Footprint edge goes through the notch's vertices: no proper transversal crossing.
    expect(validatePlacement({ ...base, envelope, aduLength: 40 }).envelopeStatus).toBe("overflow");
  });
  it("rejects self-intersecting rings and nonadjacent edge contact", () => {
    const envelope = [{ x: -20, z: -20 }, { x: 20, z: 20 }, { x: -20, z: 20 }, { x: 20, z: -20 }];
    expect(validatePlacement({ ...base, envelope }).envelopeStatus).toBe("invalid");
  });
});
