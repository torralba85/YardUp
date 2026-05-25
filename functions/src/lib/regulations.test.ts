import { describe, expect, it } from "vitest";

import { getSeededRegulationGuide } from "./regulations";

describe("getSeededRegulationGuide", () => {
  it("returns source-cited jurisdiction guidance", () => {
    const guide = getSeededRegulationGuide("los-angeles");

    expect(guide.jurisdiction).toBe("los-angeles");
    expect(guide.permitSteps.length).toBeGreaterThan(2);
    expect(guide.citations.every((citation) => citation.url.startsWith("https://"))).toBe(true);
  });

  it("returns a low-confidence source-honest local-review guide outside covered markets", () => {
    const guide = getSeededRegulationGuide("local-review");

    expect(guide.jurisdiction).toBe("local-review");
    expect(guide.confidence).toBe("low");
    expect(guide.summary).toContain("sourced local permit coverage is not available");
    expect(guide.citations).toEqual([]);
  });

  it("returns high-confidence guide for Denver", () => {
    const guide = getSeededRegulationGuide("denver");

    expect(guide.jurisdiction).toBe("denver");
    expect(guide.confidence).toBe("high");
    expect(guide.permitSteps.length).toBeGreaterThan(2);
    expect(guide.citations.every((citation) => citation.url.startsWith("https://"))).toBe(true);
  });
});
