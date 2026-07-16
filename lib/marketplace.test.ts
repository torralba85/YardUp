import { describe, expect, it } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "./feasibility";
import {
  bucketBuildBand,
  bucketRentBand,
  buildConnectionSnapshot,
  buildLeadPreview,
  extractZip,
  getMatchedBuilders,
  normalizeServiceArea,
  parseParcelCityState,
  validateOwnerContact,
} from "./marketplace";
import type { BuilderProfile } from "./marketplace-types";

const builders: BuilderProfile[] = [
  {
    id: "builder-seattle",
    ownerUid: "builder-seattle",
    companyName: "Seattle ADU Works",
    contactEmail: "team@seattle.example",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    active: true,
    credits: 0,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "builder-portland",
    ownerUid: "builder-portland",
    companyName: "Portland Homes",
    contactEmail: "team@portland.example",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Portland", state: "OR", key: "portland-or" }],
    active: true,
    credits: 0,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "inactive-seattle",
    ownerUid: "inactive-seattle",
    companyName: "Inactive Builder",
    contactEmail: "inactive@example.com",
    phone: null,
    licenseNumber: null,
    serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    active: false,
    credits: 0,
    createdAt: null,
    updatedAt: null,
  },
];

describe("marketplace domain helpers", () => {
  it("normalizes service areas to city-state keys", () => {
    expect(normalizeServiceArea(" Seattle ", "wa")).toEqual({
      city: "Seattle",
      state: "WA",
      key: "seattle-wa",
    });
  });

  it("parses parcel city/state while ignoring zip codes", () => {
    expect(parseParcelCityState("Seattle, WA 98115")).toEqual({
      city: "Seattle",
      state: "WA",
      key: "seattle-wa",
    });
  });

  it("matches only active builders in the parcel service area", () => {
    expect(getMatchedBuilders(builders, "Seattle, WA 98115").map((b) => b.id)).toEqual([
      "builder-seattle",
    ]);
  });

  it("validates minimal owner contact details and consent", () => {
    expect(
      validateOwnerContact({
        name: "Jane Owner",
        email: "jane@example.com",
        phone: "",
        message: "",
        consent: true,
      }),
    ).toEqual({
      ok: true,
      contact: {
        name: "Jane Owner",
        email: "jane@example.com",
        phone: null,
        message: null,
      },
    });
  });

  it("rejects missing consent", () => {
    expect(
      validateOwnerContact({
        name: "Jane Owner",
        email: "jane@example.com",
        phone: "",
        message: "",
        consent: false,
      }),
    ).toEqual({ ok: false, error: "Consent is required before sharing with builders." });
  });

  it("builds an immutable snapshot payload from the current scenario", () => {
    const parcel = parcelPresets[0];
    const result = {
      aduSqft: 600,
      totalFootprint: 1980,
      allowedFootprint: 2000,
      remainingCapacity: 20,
      coveragePercent: 39.6,
      maxCoveragePercent: 40,
      zoningStatus: "Compliant" as const,
      costLow: 220000,
      costHigh: 270000,
      costPerSqftLow: 367,
      costPerSqftHigh: 450,
      monthlyRent: 2050,
      annualNoi: 16605,
      paybackYears: 15.7,
      warnings: [],
      rentBasis: "Curated demo estimate",
      market: {
        source: "preset" as const,
        area: "Curated demo estimate",
        confidence: "medium" as const,
        verified: false,
      },
      operatingExpenseRatio: 0.325,
    };

    const snapshot = buildConnectionSnapshot({
      parcelKey: "oak-street",
      parcel,
      config: defaultAduConfig,
      assumptions: defaultFinancialAssumptions,
      result,
    });

    expect(snapshot.parcelCity).toBe("Seattle");
    expect(snapshot.parcelState).toBe("WA");
    expect(snapshot.reportText).toContain("LotFoundry Certificate of Feasibility");
  });
});

describe("lead preview redaction (1A paywall split)", () => {
  const result = {
    aduSqft: 600,
    totalFootprint: 1980,
    allowedFootprint: 2000,
    remainingCapacity: 20,
    coveragePercent: 39.6,
    maxCoveragePercent: 40,
    zoningStatus: "Compliant" as const,
    costLow: 218000,
    costHigh: 271000,
    costPerSqftLow: 363,
    costPerSqftHigh: 452,
    monthlyRent: 2080,
    annualNoi: 16605,
    paybackYears: 15.7,
    warnings: [],
    rentBasis: "Curated demo estimate",
    market: {
      source: "preset" as const,
      area: "Curated demo estimate",
      confidence: "medium" as const,
      verified: false,
    },
    operatingExpenseRatio: 0.325,
  };

  const snapshot = buildConnectionSnapshot({
    parcelKey: "oak-street",
    parcel: parcelPresets[0],
    config: defaultAduConfig,
    assumptions: defaultFinancialAssumptions,
    result,
  });

  it("buckets the build range into $25k bands", () => {
    expect(bucketBuildBand(218000, 271000)).toEqual({ low: 200000, high: 275000 });
  });

  it("never collapses a band to zero width", () => {
    expect(bucketBuildBand(210000, 215000)).toEqual({ low: 200000, high: 225000 });
  });

  it("buckets rent to the nearest $250", () => {
    expect(bucketRentBand(2080)).toBe(2000);
    expect(bucketRentBand(2130)).toBe(2250);
  });

  it("extracts a 5-digit ZIP and ignores its absence", () => {
    expect(extractZip("123 Maple St, Seattle, WA 98115, USA")).toBe("98115");
    expect(extractZip("123 Maple St, Seattle, WA")).toBe("");
  });

  it("produces a preview with no contact or street fields", () => {
    const preview = buildLeadPreview({ snapshot, previewSerial: "LF-abc123" });

    expect(preview.neighborhood).toBe("Seattle, WA");
    expect(preview.buildBandLow).toBe(200000);
    expect(preview.buildBandHigh).toBe(275000);
    expect(preview.rentBand).toBe(2000);
    // The rent citation rides along so the builder card matches the studio.
    expect(preview.rentBasis).toBe("Curated demo estimate");
    expect(preview.previewSerial).toBe("LF-abc123");

    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain(snapshot.parcelAddress);
    expect(serialized).not.toContain("@");
    expect(preview).not.toHaveProperty("ownerContact");
  });
});
