import { describe, expect, it } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "./feasibility";
import {
  buildConnectionSnapshot,
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
