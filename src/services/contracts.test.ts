import { describe, expect, it } from "vitest";

import { designConceptPreferencesSchema } from "../domain/schemas";
import {
  designConceptResponseSchema,
  propertyHistoryResponseSchema,
  regulationGuideResponseSchema,
} from "./contracts";

describe("service contracts", () => {
  it("validates source-cited regulation guide responses", () => {
    const parsed = regulationGuideResponseSchema.parse({
      summary: "Confirm zoning and permit steps.",
      permitSteps: ["Check jurisdiction", "Prepare plans"],
      blockers: ["Historic overlays"],
      verifiedAt: "2026-05-18",
      confidence: "high",
      citations: [{ label: "HCD", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" }],
    });

    expect(parsed.confidence).toBe("high");
  });

  it("requires property history records to carry source URLs", () => {
    expect(() =>
      propertyHistoryResponseSchema.parse({
        records: [
          {
            source: "City portal",
            recordType: "Building permit",
            date: "2025-01-01",
            summary: "Issued permit",
            citationUrl: "not-a-url",
          },
        ],
        unavailableSources: [],
        confidence: "medium",
      }),
    ).toThrow();
  });

  it("validates structured AI design concept payloads", () => {
    const result = designConceptResponseSchema.parse({
      title: "Garden studio",
      exteriorStyle: "Warm modern",
      footprintType: "compact rectangle",
      targetSqFt: 640,
      rooms: ["entry", "living", "bath"],
      constraints: ["Verify setbacks"],
      nextSteps: ["Confirm zoning"],
      thumbnailPrompt: "Original ADU concept image.",
    });

    expect(result.rooms).toContain("bath");
  });

  it("accepts optional design concept planner preferences", () => {
    const result = designConceptPreferencesSchema.parse({
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
    });

    expect(result.modelName).toBe("Garden Studio");
  });

});
