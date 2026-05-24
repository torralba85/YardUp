import { z } from "zod";

export const jurisdictionSchema = z.enum(["los-angeles", "san-diego", "san-jose", "oakland", "sacramento"]);
export const designStyleIdSchema = z.enum([
  "warm_modern",
  "farmhouse",
  "industrial",
  "coastal_minimal",
  "california_bungalow",
  "clean_gable",
]);

export const estimateInputSchema = z.object({
  aduType: z.enum(["detached", "attached", "garage_conversion", "jadu"]),
  aduSqFt: z.number().min(150).max(1200),
  buildCostPerSqFt: z.number().min(150).max(900),
  softCostRate: z.number().min(0).max(0.45),
  contingencyRate: z.number().min(0).max(0.35),
  monthlyRent: z.number().min(500).max(9000),
  opExRate: z.number().min(0.05).max(0.55),
  capRate: z.number().min(0.025).max(0.12),
});

export const projectSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  address: z.string().min(3).max(260),
  jurisdiction: jurisdictionSchema,
  lotSqFt: z.number().min(500).max(50000),
  primaryHomeSqFt: z.number().min(200).max(10000),
  status: z.string().min(1).max(80),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastEstimateInput: estimateInputSchema.optional(),
  sitePhotoUri: z.string().optional(),
});

export const inspirationSchema = z
  .object({
    id: z.string().min(1).max(120),
    title: z.string().min(1).max(180),
    jurisdiction: z.union([jurisdictionSchema, z.literal("california")]),
    style: z.string().min(1).max(120),
    budgetBand: z.enum(["under_250k", "250k_400k", "400k_plus"]),
    sqft: z.number().min(150).max(1200),
    imageUrl: z.string().url(),
    tags: z.array(z.string().min(1).max(40)).max(8),
    summary: z.string().min(1).max(500),
  })
  .optional();

export const getRegulationGuideInputSchema = z.object({
  jurisdiction: jurisdictionSchema,
});

export const generateDesignConceptInputSchema = z.object({
  project: projectSchema,
  inspiration: inspirationSchema,
  preferences: z
    .object({
      styleId: designStyleIdSchema.optional(),
      styleLabel: z.string().min(1).max(80).optional(),
      modelId: z.string().min(1).max(120).optional(),
      modelName: z.string().min(1).max(120).optional(),
      constructionMethod: z.enum(["prefab", "modular", "site_built", "conversion"]).optional(),
      targetSqFt: z.number().min(150).max(1200).optional(),
      placement: z
        .object({
          xPercent: z.number().min(0).max(100),
          yPercent: z.number().min(0).max(100),
          rotation: z.number().min(-45).max(45),
        })
        .optional(),
      fitSignals: z
        .array(
          z.object({
            id: z.string().min(1).max(80),
            label: z.string().min(1).max(80),
            value: z.string().min(1).max(120),
            detail: z.string().min(1).max(240),
            status: z.enum(["good", "review", "blocked"]),
          }),
        )
        .max(8)
        .optional(),
      hasSitePhoto: z.boolean().optional(),
    })
    .optional(),
});

export const searchPropertyHistoryInputSchema = z.object({
  address: z.string().min(3).max(260),
  projectId: z.string().min(1).max(120),
});

export const submitQuoteRequestInputSchema = z.object({
  projectId: z.string().min(1).max(120),
  contractorId: z.string().min(1).max(120),
  packetItems: z.array(z.string().min(1).max(80)).min(1).max(12),
});
