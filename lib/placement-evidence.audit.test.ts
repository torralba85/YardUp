import { describe, expect, it } from "vitest";
import { parcelPresets } from "./feasibility";
import type { PlacementResult } from "./placement-validation";
import { describePlacementWithEvidence } from "./placement-evidence";

const preset = parcelPresets[0];
const placement: PlacementResult = {
  status: "fits", envelopeStatus: "fits", houseStatus: "clear",
  envelopeClearanceFt: 10, houseClearanceFt: 15, roofClearanceFt: 12,
  reasons: [], rotatedAlternative: null,
};

describe("audit: evidence is not inferred from missing source metadata", () => {
  it("qualifies a legacy parcel with no provider or demo identity", () => {
    const legacy = {
      address: preset.address, city: preset.city, lotArea: preset.lotArea,
      lotWidth: preset.lotWidth, lotLength: preset.lotLength,
      existingHouseSqft: preset.existingHouseSqft,
      maxLotCoveragePercent: preset.maxLotCoveragePercent, setbacks: preset.setbacks,
    };
    const status = describePlacementWithEvidence(placement, legacy);
    expect(status.missingEvidenceNotice).toMatch(/boundary.*unavailable/i);
    if (placement.status === "fits") {
      expect(status.title).toBe("Fits the estimated model");
      expect(status.tone).toBe("review");
    }
  });

  it("qualifies missing parcel evidence instead of claiming verified fit", () => {
    const status = describePlacementWithEvidence(placement);
    expect(status.missingEvidenceNotice).toMatch(/unverified/i);
    if (placement.status === "fits") expect(status.tone).toBe("review");
  });

  it("keeps explicit curated demo feedback distinct", () => {
    expect(describePlacementWithEvidence(placement, preset).missingEvidenceNotice).toBeUndefined();
  });
});
