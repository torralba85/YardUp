import { describe, expect, it } from "vitest";
import { inferJurisdiction, regulationGuides } from "./regulations-data";

describe("regulations data layers", () => {
  it("resolves specific cities correctly", () => {
    expect(inferJurisdiction("123 Oak St, Denver, CO 80202")).toBe("denver");
    expect(inferJurisdiction("812 Linden Ave, Portland, OR")).toBe("corner-lot");
    expect(inferJurisdiction("44 Mesa Ct, Austin, TX")).toBe("compact-lot");
    expect(inferJurisdiction("123 Cherry St, Oakland, CA")).toBe("oakland");
  });

  it("falls back to local-review for unsupported cities", () => {
    expect(inferJurisdiction("1200 Pine St, Boston, MA")).toBe("local-review");
  });

  it("checks regulation details structure", () => {
    const guide = regulationGuides["denver"];
    expect(guide.title).toContain("Denver");
    expect(guide.permitSteps.length).toBeGreaterThan(0);
    expect(guide.citations.length).toBeGreaterThan(0);
  });
});
