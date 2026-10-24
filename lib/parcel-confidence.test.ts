import { describe, expect, it } from "vitest";
import type { DataEvidence } from "./data-evidence";
import type { LiveParcelData, ParcelDataQuality } from "./parcel-types";
import {
  parcelConfidence,
  parcelDataNotice,
} from "./parcel-confidence";
import { parcelPresets } from "./feasibility";

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
  it.each(["fallback", "estimated"] as const)("never treats a borrowed house in a legacy %s parcel as measured", (source) => {
    const fallback = { ...parcel(quality("observed")), source };
    delete fallback.dataQuality;
    expect(parcelConfidence(fallback).footprintKnown).toBe(false);
    expect(parcelConfidence(fallback).physicalEstimated).toBe(true);
  });

  it.each(["defaulted", "derived", "unavailable"] as const)("rejects %s building area as a measured footprint", (status) => {
    const data = parcel(quality("observed"));
    data.dataQuality!.fields.existingHouseSqft.status = status;
    expect(parcelConfidence(data).footprintKnown).toBe(false);
  });
  it("marks a Regrid parcel's regulatory values estimated when evidence says they are defaults", () => {
    expect(parcelConfidence(parcel(quality("defaulted"))).regulationsEstimated).toBe(true);
  });

  it("accepts regulatory values only when every regulatory field is observed", () => {
    expect(parcelConfidence(parcel(quality("observed"))).regulationsEstimated).toBe(false);
  });

  it("gives demo presets no notice and carries reconciliation warnings into live parcel notices", () => {
    expect(parcelDataNotice(parcelPresets[0])).toBeUndefined();
    const data = parcel(quality("defaulted"));
    data.dataQuality!.warnings = [
      "The parcel provider's situs street address (125 Oak St) differs from the searched street address; verify parcel boundaries against county records.",
      "Geocoded ZIP (98105) differs from the parcel record ZIP (98107); confirm property location.",
    ];

    const notice = parcelDataNotice(data);
    expect(notice).toContain("situs street address (125 Oak St) differs");
    expect(notice).toContain("Geocoded ZIP (98105) differs from the parcel record ZIP (98107)");
  });

  it.each(["regrid", "fallback"] as const)("shows ATTOM conflicts in %s notices despite earlier warnings", (source) => {
    const data = parcel(quality("observed"));
    data.source = source;
    const warning = "ATTOM's point for the searched address falls outside the returned parcel; confirm the address and boundary with county records.";
    data.dataQuality!.warnings.push(warning);
    data.dataQuality!.fields.address.warnings = ["Existing address caveat.", warning];
    data.dataQuality!.addressVerification = {
      ...observed("Property Basic Profile"),
      source: { provider: "ATTOM", dataset: "Property Basic Profile", recordId: "123456" },
      confidence: "low",
      warnings: ["ATTOM confirms only the property address.", warning],
    };
    expect(parcelDataNotice(data)).toContain(warning);
  });
});


