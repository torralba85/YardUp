import { describe, expect, it } from "vitest";

import { makeLocalConcept } from "./designConcept";
import type { Project } from "../types";

const project: Project = {
  id: "starter-echo-park",
  name: "Echo Park ADU study",
  address: "1420 Baxter St, Los Angeles, CA",
  jurisdiction: "los-angeles",
  lotSqFt: 5200,
  primaryHomeSqFt: 1420,
  status: "estimated",
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z",
  lastEstimateInput: {
    aduType: "detached",
    aduSqFt: 650,
    buildCostPerSqFt: 385,
    softCostRate: 0.18,
    contingencyRate: 0.12,
    monthlyRent: 3200,
    opExRate: 0.22,
    capRate: 0.055,
  },
};

describe("makeLocalConcept", () => {
  it("returns a client-compatible design concept without personal address text", () => {
    const concept = makeLocalConcept(project);

    expect(concept.title).toContain(project.name);
    expect(concept.targetSqFt).toBe(650);
    expect(concept.constraints.join(" ")).toContain("jurisdiction");
    expect(concept.thumbnailPrompt).not.toContain("1420 Baxter");
  });

  it("adapts inspiration style and size when provided", () => {
    const concept = makeLocalConcept(project, {
      id: "idea-1",
      title: "Garden studio",
      jurisdiction: "california",
      style: "Coastal minimal",
      budgetBand: "250k_400k",
      sqft: 780,
      imageUrl: "https://example.com/adu.jpg",
      tags: ["detached"],
      summary: "A compact model.",
    });

    expect(concept.title).toBe("Adapt Garden studio");
    expect(concept.exteriorStyle).toBe("Coastal minimal");
    expect(concept.footprintType).toBe("one-bedroom bar plan");
  });
});
