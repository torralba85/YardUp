import { describe, expect, it } from "vitest";
import { inferJurisdiction, regulationGuides } from "./regulations-data";
import { getParcelById } from "./feasibility";

describe("regulations data layers", () => {
  it("keeps San Jose's two standards and fire checks explicit", () => {
    const guide = regulationGuides["san-jose"];
    const checklist = [guide.summary, ...guide.permitSteps, ...guide.blockers].join(" ");
    for (const fact of ["20.80.175", "20.80.176", "never mix", "1,000", "1,200", "9,000", "800", "150 ft", "4 ft", "600 ft", "1,000 gpm", "20 psi", "water-company", "40%", "6 ft", "30 days"]) {
      expect(checklist).toContain(fact);
    }
    expect(checklist).not.toContain("Utility metering conflicts");
    expect(guide.citations.some(({ url }) => url.includes("39038"))).toBe(true);
    for (const { url } of guide.citations) {
      expect(new URL(url).pathname).not.toBe("/");
    }
  });

  it("maps the fictional San Diego preset to the existing city guide", () => {
    const parcel = getParcelById("coyote-brush");
    expect(inferJurisdiction(parcel.address)).toBe("san-diego");
    expect(inferJurisdiction(`${parcel.address}, ${parcel.city}`)).toBe("san-diego");
    expect(regulationGuides[inferJurisdiction(parcel.address)]).toBe(regulationGuides["san-diego"]);
    expect(inferJurisdiction("1234 Coyote Brush Court, Denver, CO")).toBe("denver");
  });
  it("resolves specific cities correctly", () => {
    expect(inferJurisdiction("123 Oak St, Denver, CO 80202")).toBe("denver");
    expect(inferJurisdiction("812 Linden Ave, Portland, OR")).toBe("corner-lot");
    expect(inferJurisdiction("44 Mesa Ct, Austin, TX")).toBe("compact-lot");
    expect(inferJurisdiction("123 Cherry St, Oakland, CA")).toBe("oakland");
  });

  it("falls back to local-review for unsupported cities", () => {
    expect(inferJurisdiction("1200 Pine St, Boston, MA")).toBe("local-review");
  });

  it("prefers the real city over demo street aliases", () => {
    expect(inferJurisdiction("1 Oak Street, Los Angeles, CA")).toBe("los-angeles");
    expect(inferJurisdiction("9 Linden Ave, Sacramento, CA")).toBe("sacramento");
    // Preset addresses without a city still resolve via their street alias.
    expect(inferJurisdiction("1234 Oak Street")).toBe("oak-street");
  });

  it("checks regulation details structure", () => {
    const guide = regulationGuides["denver"];
    expect(guide.title).toContain("Denver");
    expect(guide.permitSteps.length).toBeGreaterThan(0);
    expect(guide.citations.length).toBeGreaterThan(0);
  });
});
