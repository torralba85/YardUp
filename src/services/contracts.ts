import { z } from "zod";

import { designConceptSchema } from "../domain/schemas";

export const regulationGuideResponseSchema = z.object({
  summary: z.string(),
  permitSteps: z.array(z.string()),
  blockers: z.array(z.string()),
  verifiedAt: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  citations: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
    }),
  ),
});

export const propertyHistoryResponseSchema = z.object({
  records: z.array(
    z.object({
      source: z.string(),
      recordType: z.string(),
      date: z.string(),
      summary: z.string(),
      citationUrl: z.string().url(),
    }),
  ),
  unavailableSources: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

export const designConceptResponseSchema = designConceptSchema.extend({
  citations: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
      }),
    )
    .optional(),
});

export type RegulationGuideResponse = z.infer<typeof regulationGuideResponseSchema>;
export type PropertyHistoryResponse = z.infer<typeof propertyHistoryResponseSchema>;
export type DesignConceptResponse = z.infer<typeof designConceptResponseSchema>;
