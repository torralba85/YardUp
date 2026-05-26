import { describe, expect, it } from "vitest";

import { aduModels } from "./aduModels";
import { contractorProfiles } from "./contractors";
import { designStyles } from "./designStyles";
import { parcelSummaries } from "./parcelSummaries";
import { inferJurisdiction } from "./regulations";

describe("professional refinement seed data", () => {
  it("ships contractor profiles with quote-ready trust signals", () => {
    expect(contractorProfiles.length).toBeGreaterThanOrEqual(3);
    for (const contractor of contractorProfiles) {
      expect(contractor.matchScore).toBeGreaterThanOrEqual(80);
      expect(contractor.licenseStatus).toBe("verified");
      expect(contractor.insuranceStatus).toBe("verified");
      expect(contractor.priceRange).toMatch(/\$/);
      expect(contractor.tags.length).toBeGreaterThan(1);
      expect(contractor.supportedJurisdictions.length).toBeGreaterThan(0);
    }
  });

  it("includes ADU model specs suitable for mobile comparison cards", () => {
    for (const model of aduModels) {
      expect(model.sqft).toBeGreaterThan(250);
      expect(model.priceFrom).toBeGreaterThan(200000);
      expect(model.fitScore).toBeGreaterThanOrEqual(80);
      expect(model.dimensions).toContain("ft");
      expect(model.footprint.widthFt).toBeGreaterThan(10);
      expect(model.footprint.depthFt).toBeGreaterThan(10);
      expect(model.styleIds.length).toBeGreaterThanOrEqual(2);
      expect(model.fitNotes.length).toBeGreaterThanOrEqual(2);
      expect(model.accessibilityFeatures.length + model.familyFeatures.length).toBeGreaterThan(1);
    }
  });

  it("ships the explicit one-tap style system used by the planner", () => {
    expect(designStyles.map((style) => style.id).sort()).toEqual([
      "california_bungalow",
      "clean_gable",
      "coastal_minimal",
      "farmhouse",
      "industrial",
      "warm_modern",
    ]);
    expect(aduModels.every((model) => model.styleIds.every((styleId) => designStyles.some((style) => style.id === styleId)))).toBe(true);
  });

  it("covers every California starter jurisdiction with parcel facts", () => {
    expect(parcelSummaries.map((parcel) => parcel.jurisdiction).sort()).toEqual([
      "los-angeles",
      "oakland",
      "sacramento",
      "san-diego",
      "san-jose",
    ]);
  });

  it("does not route an address outside sourced coverage into Los Angeles", () => {
    expect(inferJurisdiction("610 Pearl St, Denver, CO")).toBe("denver");
    expect(inferJurisdiction("1420 Baxter St, Los Angeles, CA")).toBe("los-angeles");
    expect(inferJurisdiction("123 Main St, Seattle, WA")).toBe("local-review");
  });
});
