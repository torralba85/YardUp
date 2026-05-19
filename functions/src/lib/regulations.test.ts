import { describe, expect, it } from "vitest";

import { getSeededRegulationGuide } from "./regulations";

describe("getSeededRegulationGuide", () => {
  it("returns source-cited jurisdiction guidance", () => {
    const guide = getSeededRegulationGuide("los-angeles");

    expect(guide.jurisdiction).toBe("los-angeles");
    expect(guide.permitSteps.length).toBeGreaterThan(2);
    expect(guide.citations.every((citation) => citation.url.startsWith("https://"))).toBe(true);
  });
});
