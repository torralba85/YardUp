import { describe, expect, it } from "vitest";
import { describePlacementWithEvidence } from "./placement-evidence";
import type { PlacementResult } from "./placement-validation";
import type { Parcel } from "./feasibility";

describe("describePlacementWithEvidence", () => {
  const fitsResult = { status: "fits", reasons: [], houseClearanceFt: 15 } as unknown as PlacementResult;
  const blockedResult = { status: "blocked", reasons: [], houseClearanceFt: null } as unknown as PlacementResult;

  it("returns base for demo preset", () => {
    const preset = { id: "demo" } as unknown as Parcel;
    const res = describePlacementWithEvidence(fitsResult, preset);
    expect(res.title).toBe("Fits at this placement");
    expect(res.missingEvidenceNotice).toBeUndefined();
  });

  it("applies caution tone and estimated title for fits on live parcel", () => {
    const live = { id: "live", source: "regrid", boundaryGeoJson: { coordinates: [] } } as unknown as Parcel;
    const res = describePlacementWithEvidence(fitsResult, live);
    expect(res.title).toBe("Fits the estimated model");
    expect(res.tone).toBe("review");
    expect(res.missingEvidenceNotice).toContain("Recorded GIS boundary");
    expect(res.missingEvidenceNotice).toContain("Fit is not zoning approval");
  });

  it("retains blocked status but adds missing evidence notice for live parcel", () => {
    const liveNoBoundary = { id: "live", source: "regrid", boundaryGeoJson: null } as unknown as Parcel;
    const res = describePlacementWithEvidence(blockedResult, liveNoBoundary);
    expect(res.title).toBe("Doesn't fit at this placement");
    expect(res.tone).toBe("blocked");
    expect(res.missingEvidenceNotice).toContain("Measured boundary is unavailable.");
  });
});
