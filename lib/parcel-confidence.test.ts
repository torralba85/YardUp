import { describe, expect, it } from "vitest";
import type { DataEvidence } from "./data-evidence";
import type { LiveParcelData, ParcelDataQuality } from "./parcel-types";
import { parcelConfidence } from "./parcel-confidence";

const observed = (dataset: string): DataEvidence => ({
  status: "observed",
  source: { provider: "test", dataset },
  retrievedAt: "2026-09-25T00:00:00.000Z",
  confidence: "high",
  warnings: [],
});

function quality(regulatoryStatus: DataEvidence["status"]): ParcelDataQuality {
  const field = (dataset: string): DataEvidence => ({
    ...observed(dataset),
    status: regulatoryStatus,
    confidence: regulatoryStatus === "observed" ? "high" : "low",
  });
  return {
    version: 1,
    fields: {
      address: observed("address"),
      lotArea: observed("area"),
      lotDimensions: observed("dimensions"),
      existingHouseSqft: observed("footprint"),
      boundaryGeoJson: observed("boundary"),
      zoning: field("zoning"),
      setbacks: field("setbacks"),
      maxLotCoveragePercent: field("coverage"),
    },
    providerAttempts: [],
    warnings: [],
  };
}

function parcel(dataQuality: ParcelDataQuality): LiveParcelData {
  return {
    address: "123 Oak St",
    city: "Seattle, WA",
    state: "WA",
    zip: "98105",
    lat: 47.66,
    lng: -122.31,
    source: "regrid",
    zoning: "R-1",
    boundaryGeoJson: null,
    lotArea: 6000,
    lotWidth: 50,
    lotLength: 120,
    existingHouseSqft: 1800,
    maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 20, side: 5 },
    dataQuality,
  };
}

describe("parcelConfidence", () => {
  it("marks a Regrid parcel's regulatory values estimated when evidence says they are defaults", () => {
    expect(parcelConfidence(parcel(quality("defaulted"))).regulationsEstimated).toBe(true);
  });

  it("accepts regulatory values only when every regulatory field is observed", () => {
    expect(parcelConfidence(parcel(quality("observed"))).regulationsEstimated).toBe(false);
  });
});
