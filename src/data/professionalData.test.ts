import { describe, expect, it } from "vitest";

import { aduModels } from "./aduModels";
import { contractorProfiles } from "./contractors";
import { parcelSummaries } from "./parcelSummaries";

describe("professional refinement seed data", () => {
  it("ships contractor profiles with quote-ready trust signals", () => {
    expect(contractorProfiles.length).toBeGreaterThanOrEqual(3);
    for (const contractor of contractorProfiles) {
      expect(contractor.matchScore).toBeGreaterThanOrEqual(80);
      expect(contractor.licenseStatus).toBe("verified");
      expect(contractor.insuranceStatus).toBe("verified");
      expect(contractor.priceRange).toMatch(/\$/);
      expect(contractor.tags.length).toBeGreaterThan(1);
    }
  });

  it("includes ADU model specs suitable for mobile comparison cards", () => {
    for (const model of aduModels) {
      expect(model.sqft).toBeGreaterThan(250);
      expect(model.priceFrom).toBeGreaterThan(200000);
      expect(model.fitScore).toBeGreaterThanOrEqual(80);
      expect(model.dimensions).toContain("ft");
    }
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
});
