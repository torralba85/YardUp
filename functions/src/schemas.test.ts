import { describe, expect, it } from "vitest";

import {
  generateDesignConceptInputSchema,
  getRegulationGuideInputSchema,
  searchPropertyHistoryInputSchema,
  submitQuoteRequestInputSchema,
  submitFeedbackInputSchema,
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

  it("validates feedback payloads", () => {
    const valid = submitFeedbackInputSchema.parse({
      category: "bug",
      message: "This is a valid feedback message with more than 5 characters.",
      rating: 5,
      pageIdentifier: "Home",
      clientVersion: "1.0.0",
      deviceInfo: {
        os: "ios",
        osVersion: "15.0",
        model: "iPhone 13",
        brand: "Apple",
      },
    });
    expect(valid.category).toBe("bug");
    expect(valid.message).toContain("valid feedback");

    // Invalid category
    expect(() =>
      submitFeedbackInputSchema.parse({
        category: "invalid_category" as any,
        message: "Valid length message.",
      })
    ).toThrow();

    // Message too short (< 5 chars)
    expect(() =>
      submitFeedbackInputSchema.parse({
        category: "general",
        message: "Oops",
      })
    ).toThrow();

    // Message too long (> 1000 chars)
    const longMessage = "a".repeat(1001);
    expect(() =>
      submitFeedbackInputSchema.parse({
        category: "general",
        message: longMessage,
      })
    ).toThrow();

    // Rating out of bounds (< 1 or > 5)
    expect(() =>
      submitFeedbackInputSchema.parse({
        category: "general",
        message: "Valid message content.",
        rating: 6,
      })
    ).toThrow();
  });
});
