import { describe, expect, it } from "vitest";

import {
  generateDesignConceptInputSchema,
  getRegulationGuideInputSchema,
  searchPropertyHistoryInputSchema,
  submitQuoteRequestInputSchema,
} from "./schemas";

describe("callable input schemas", () => {
  it("accepts supported jurisdictions only", () => {
    expect(getRegulationGuideInputSchema.parse({ jurisdiction: "oakland" }).jurisdiction).toBe("oakland");
    expect(() => getRegulationGuideInputSchema.parse({ jurisdiction: "denver" })).toThrow();
  });

  it("validates concept inputs before AI calls", () => {
    const parsed = generateDesignConceptInputSchema.parse({
      project: {
        id: "project-1",
        name: "Echo Park ADU study",
        address: "1420 Baxter St, Los Angeles, CA",
        jurisdiction: "los-angeles",
        lotSqFt: 5200,
        primaryHomeSqFt: 1420,
        status: "estimated",
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z",
      },
      preferences: {
        styleId: "warm_modern",
        styleLabel: "Warm Modern",
        modelId: "studio-340",
        modelName: "Garden Studio",
        constructionMethod: "prefab",
        targetSqFt: 340,
        placement: { xPercent: 68, yPercent: 70, rotation: 0 },
        fitSignals: [
          {
            id: "buildable-area",
            label: "Buildable area",
            value: "340/860 sqft",
            detail: "Model fits the starter buildable-area allowance.",
            status: "good",
          },
        ],
        hasSitePhoto: true,
      },
    });

    expect(parsed.project.jurisdiction).toBe("los-angeles");
    expect(parsed.preferences?.modelName).toBe("Garden Studio");
  });

  it("bounds property history and quote request payloads", () => {
    expect(searchPropertyHistoryInputSchema.parse({ address: "Oakland, CA", projectId: "p1" }).projectId).toBe("p1");
    expect(
      submitQuoteRequestInputSchema.parse({
        projectId: "p1",
        contractorId: "c1",
        packetItems: ["ROI model", "Lot summary"],
      }).packetItems,
    ).toHaveLength(2);
  });
});
