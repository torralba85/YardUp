import { describe, expect, it } from "vitest";
import { buildSetbackEnvelope, describePlacement, describePlacementWithEvidence, REVIEW_SEPARATION_FT, validatePlacement, type PlacementInput, type PlacementResult } from "./placement-validation";
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
  it("does not call a sub-inch gap to the house a fit", () => {
    // Regression: a 0.05 ft (0.6 in) wall gap used to read "Fits" with no reasons.
    const houseAt = (gapFt: number) => rectangleCorners({ x: 15 + gapFt, z: 0 }, 10, 10);
    const nearlyTouching = validatePlacement({ ...base, existingHouseCorners: houseAt(0.05) });
    expect(nearlyTouching.houseStatus).toBe("close");
    expect(nearlyTouching.status).toBe("review");
    expect(describePlacement(nearlyTouching).detail).toContain("0.6 in between walls");

    expect(validatePlacement({ ...base, existingHouseCorners: houseAt(REVIEW_SEPARATION_FT - 0.5) }).status).toBe("review");
    const separated = validatePlacement({ ...base, existingHouseCorners: houseAt(REVIEW_SEPARATION_FT) });
    expect(separated.status).toBe("fits");
    expect(describePlacement(separated).detail).toContain("about 10.0 ft from the modeled existing structure");
  });
  it("reports roof edges that overlap in plan while the walls clear", () => {
    const placement = validatePlacement({
      ...base,
      existingHouseCorners: rectangleCorners({ x: 16, z: 0 }, 10, 10),
      aduRoofOverhangFt: { width: 0.8, depth: 0.8 },
      existingHouseRoofOverhangFt: 0.8,
    });
    expect(placement.houseClearanceFt).toBeCloseTo(1, 5);
    expect(placement.roofClearanceFt).toBeCloseTo(-0.6, 5);
    expect(describePlacement(placement).detail).toContain("the roof edges overlap in plan");
    expect(validatePlacement({ ...base, existingHouseCorners: null, aduRoofOverhangFt: { width: 1, depth: 1 }, existingHouseRoofOverhangFt: 1 }).roofClearanceFt).toBeNull();
  });
  it("suggests a rotation that opens up the separation", () => {
    // 20x30 ADU with its long side facing a house 4 ft away; turning it in place pulls that wall back 5 ft.
    const placement = validatePlacement({ ...base, aduLength: 30, existingHouseCorners: rectangleCorners({ x: 0, z: 24 }, 10, 10) });
    expect(placement.houseStatus).toBe("close");
    expect(placement.rotatedAlternative?.recommended).toBe(false);
    const wide = validatePlacement({ ...base, aduLength: 30, envelope: buildSetbackEnvelope(60, 60, { side: 5, front: 0, rear: 5 }), existingHouseCorners: rectangleCorners({ x: 0, z: 26 }, 10, 10) });
    expect(wide.houseStatus).toBe("close");
    expect(wide.rotatedAlternative?.recommended).toBe(true);
    expect(describePlacement(wide).detail).toContain("would leave about 11.0 ft from the house");
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

  describe("describePlacementWithEvidence", () => {
    it("appends missing evidence notice when geometry is estimated and placement fits", () => {
      const placement = {
        status: "fits",
        reasons: [],
        houseClearanceFt: 15
      } as unknown as PlacementResult;
      
      const presetParcel = { id: "demo" } as unknown as import("./feasibility").Parcel; // no source
      expect(describePlacementWithEvidence(placement, presetParcel).title).toBe("Fits at this placement");
      
      const realParcel = { id: "real", source: "regrid" } as unknown as import("./feasibility").Parcel;
      const evidence = describePlacementWithEvidence(placement, realParcel);
      expect(evidence.title).toBe("Fits the estimated model");
      expect(evidence.missingEvidenceNotice).toContain("Measured boundary or house footprint is unavailable");
    });

    it("preserves blocked tone without qualification", () => {
      const placement = {
        status: "blocked",
        reasons: [],
        houseClearanceFt: null
      } as unknown as PlacementResult;
      const realParcel = { id: "real", source: "regrid" } as unknown as import("./feasibility").Parcel;
      const evidence = describePlacementWithEvidence(placement, realParcel);
      expect(evidence.title).toBe("Doesn't fit at this placement");
      expect(evidence.missingEvidenceNotice).toBeUndefined();
    });
  });
});
