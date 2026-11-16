import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAduConfig, footprintOptions, parcelPresets } from "./feasibility";
import type { Parcel } from "./parcel-types";
import { REVIEW_SEPARATION_FT, validatePlacement, type PlacementInput, type PlacementResult } from "./placement-validation";
import * as placement from "./placement-validation";
import { buildExistingHouseSceneModel, rectangleCorners } from "./scene-model";
import {
  describePlacement,
  findBestFitPose,
  getAduPlacementBounds,
  getDefaultAduPose,
  getScenePlacement,
  snapPoseToSetbackEnvelope,
} from "./scene-placement";

afterEach(() => vi.restoreAllMocks());

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

describe("getDefaultAduPose", () => {
  it("turns the Seattle ADU to leave a review-free separation from the house", () => {
    // Unturned, the 20x30 ADU gets at most 4 ft behind Seattle's modeled 30x46
    // house. Turned 90° it spans the 30 ft buildable width and gains 10 ft of
    // depth, without changing either declared footprint.
    const parcel = parcelPresets[0];
    const pose = getDefaultAduPose(parcel, defaultAduConfig);
    const result = getScenePlacement(parcel, defaultAduConfig, pose);

    expect(pose.rotationDeg).toBe(90);
    expect(result.status).toBe("fits");
    expect(result.houseClearanceFt).toBeGreaterThanOrEqual(REVIEW_SEPARATION_FT);
    expect(buildExistingHouseSceneModel(parcel).footprint.areaSqft).toBe(parcel.existingHouseSqft);
  });

  it("keeps the entered orientation when it already leaves enough room", () => {
    const pose = getDefaultAduPose(parcelPresets[1], defaultAduConfig);
    expect(pose.rotationDeg).toBe(0);
    expect(getScenePlacement(parcelPresets[1], defaultAduConfig, pose).houseStatus).toBe("clear");
  });

  it("starts at the most room available instead of overlapping the house", () => {
    // Austin's rear yard is exactly as deep as the 30 ft ADU: the old default
    // started 3 ft inside the house. The best pose touches it and says so.
    const parcel = parcelPresets[2];
    const result = getScenePlacement(parcel, defaultAduConfig, getDefaultAduPose(parcel, defaultAduConfig));
    expect(result.houseClearanceFt).toBeCloseTo(0, 5);
    expect(result.status).toBe("review");
  });

  it("stays inside the setback envelope for every preset and size", () => {
    for (const parcel of parcelPresets) {
      for (const option of footprintOptions) {
        const config = { width: option.width, length: option.length };
        expect(getScenePlacement(parcel, config, getDefaultAduPose(parcel, config)).envelopeStatus).toBe("fits");
      }
    }
  });

  it("falls back to the rear-biased position rather than inventing room on a full lot", () => {
    // A lot with no gap either side of the house cannot be satisfied. The pose
    // helper must not fabricate a position outside the envelope; placement
    // validation reports the overlap instead.
    const full = { ...parcelPresets[0], lotLength: 60, existingHouseSqft: 1380 };
    const pose = getDefaultAduPose(full, defaultAduConfig);
    const bounds = getAduPlacementBounds(full, defaultAduConfig);

    expect(pose.z).toBe(Math.min(bounds.minZ + 3, bounds.maxZ));
    expect(getScenePlacement(full, defaultAduConfig, pose).status).not.toBe("fits");
  });
});

describe("getScenePlacement", () => {
  it("measures the roof-edge gap when the roof style is known", () => {
    // Seattle's old default: 3 ft between walls, but the house's 0.8 ft eave
    // and the shed roof's ~0.72 ft length overhang leave under 1.5 ft of air.
    const parcel = parcelPresets[0];
    const house = buildExistingHouseSceneModel(parcel).boundsLocal!;
    const pose = { x: 0, z: house.minZ - 3 - defaultAduConfig.length / 2, rotationDeg: 0 };
    const result = getScenePlacement(parcel, defaultAduConfig, pose);

    expect(result.houseClearanceFt).toBeCloseTo(3, 5);
    expect(result.roofClearanceFt).toBeGreaterThan(1.4);
    expect(result.roofClearanceFt).toBeLessThan(1.5);
    expect(getScenePlacement(parcel, { width: 20, length: 30 }, pose).roofClearanceFt).toBeNull();
  });
});

describe("findBestFitPose", () => {
  const input: PlacementInput = {
    aduWidth: 20,
    aduLength: 30,
    pose: { x: 0, z: 10, rotationDeg: 0 },
    envelope: rectangleCorners({ x: 0, z: 0 }, 30, 100, 0),
    existingHouseCorners: rectangleCorners({ x: 0, z: 15 }, 30, 40, 0),
  };

  it("finds the nearest fit without exhaustively validating farther candidates", () => {
    const validate = vi.spyOn(placement, "validatePlacement");
    const concave = {
      ...input,
      envelope: [
        { x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: -20 },
        { x: -10, z: -20 }, { x: -10, z: 50 }, { x: -50, z: 50 },
      ],
    };
    expect(findBestFitPose(concave)).toEqual({ x: -35, z: 10, rotationDeg: 0 });
    // Deterministic work budget, independent of CPU speed. The unpruned
    // search checks 1,542 poses for this envelope, including its distant arm.
    expect(validate.mock.calls.length).toBeLessThan(1200);
  });

  it("stops after diagnosing an invalid envelope that moving cannot repair", () => {
    const validate = vi.spyOn(placement, "validatePlacement");
    expect(
      findBestFitPose({
        ...input,
        envelope: [
          { x: -50, z: -50 }, { x: 50, z: 50 },
          { x: -50, z: 50 }, { x: 50, z: -50 },
        ],
      }),
    ).toBeNull();
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
    const concave = {
      ...input,
      envelope: [
        { x: -50, z: -50 }, { x: 50, z: -50 }, { x: 50, z: -20 },
        { x: -10, z: -20 }, { x: -10, z: 50 }, { x: -50, z: 50 },
      ],
    };
    const pose = findBestFitPose(concave);
    expect(pose).not.toBeNull();
    expect(validatePlacement({ ...concave, pose: pose! }).status).toBe("fits");
  });
});

describe("snapPoseToSetbackEnvelope", () => {
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

  it("snaps a near miss back to the modeled ADU boundary", () => {
    const snapped = snapPoseToSetbackEnvelope(
      parcel,
      config,
      { x: 11.25, z: 0, rotationDeg: 0 },
      0.5,
    );
    expect(snapped?.x).toBeCloseTo(11);
    expect(snapped?.z).toBe(0);
    expect(getScenePlacement(parcel, config, snapped!).envelopeStatus).toBe("fits");
  });

  it("does not hide a larger violation", () => {
    expect(
      snapPoseToSetbackEnvelope(parcel, config, { x: 12, z: 0, rotationDeg: 0 }, 0.5),
    ).toBeNull();
  });

  it("snaps against California ADU setbacks rather than larger raw parcel setbacks", () => {
    const caWideSetbacks: Parcel = {
      ...parcel,
      city: "Oceanside, CA 92054",
      setbacks: { front: 20, rear: 15, side: 10 },
    };
    // With CA 4 ft side cap, max center X for a 10 ft wide ADU on a 40 ft lot is 11 ft.
    const snapped = snapPoseToSetbackEnvelope(
      caWideSetbacks,
      config,
      { x: 11.25, z: 0, rotationDeg: 0 },
      0.5,
    );
    expect(snapped?.x).toBeCloseTo(11);
    expect(getScenePlacement(caWideSetbacks, config, snapped!).envelopeStatus).toBe("fits");
  });
});

describe("describePlacement", () => {
  const fitsResult: PlacementResult = {
    status: "fits",
    envelopeStatus: "fits",
    houseStatus: "clear",
    envelopeClearanceFt: 10,
    houseClearanceFt: 15,
    roofClearanceFt: 12,
    reasons: [],
    rotatedAlternative: null,
  };
  const blockedResult = {
    status: "blocked",
    reasons: [],
    houseClearanceFt: null,
  } as unknown as PlacementResult;

  it("returns base clear status for demo preset", () => {
    const preset = { id: "demo" } as unknown as Parcel;
    const res = describePlacement(fitsResult, preset);
    expect(res.title).toBe("Fits at this placement");
    expect(res.tone).toBe("clear");
    expect(res.missingEvidenceNotice).toBeUndefined();
  });

  it("applies review tone and estimated title for fits on live parcel", () => {
    const live = { id: "live", source: "regrid", boundaryGeoJson: { coordinates: [] } } as unknown as Parcel;
    const res = describePlacement(fitsResult, live);
    expect(res.title).toBe("Fits the estimated model");
    expect(res.tone).toBe("review");
    expect(res.missingEvidenceNotice).toContain("Recorded GIS boundary");
    expect(res.missingEvidenceNotice).toContain("Fit is not zoning approval");
  });

  it("retains blocked status but adds missing evidence notice for live parcel", () => {
    const liveNoBoundary = { id: "live", source: "regrid", boundaryGeoJson: null } as unknown as Parcel;
    const res = describePlacement(blockedResult, liveNoBoundary);
    expect(res.title).toBe("Doesn't fit at this placement");
    expect(res.tone).toBe("blocked");
    expect(res.missingEvidenceNotice).toContain("Measured boundary is unavailable.");
  });

  it("qualifies a legacy parcel with no provider or demo identity", () => {
    const preset = parcelPresets[0];
    const legacy: Parcel = {
      address: preset.address,
      city: preset.city,
      lotArea: preset.lotArea,
      lotWidth: preset.lotWidth,
      lotLength: preset.lotLength,
      existingHouseSqft: preset.existingHouseSqft,
      maxLotCoveragePercent: preset.maxLotCoveragePercent,
      setbacks: preset.setbacks,
    };
    const status = describePlacement(fitsResult, legacy);
    expect(status.missingEvidenceNotice).toMatch(/boundary.*unavailable/i);
    expect(status.title).toBe("Fits the estimated model");
    expect(status.tone).toBe("review");
  });

  it("qualifies missing parcel evidence instead of claiming verified fit", () => {
    const status = describePlacement(fitsResult);
    expect(status.missingEvidenceNotice).toMatch(/unverified/i);
    expect(status.tone).toBe("review");
  });

  it("keeps explicit curated demo feedback distinct", () => {
    expect(describePlacement(fitsResult, parcelPresets[0]).missingEvidenceNotice).toBeUndefined();
  });
});
