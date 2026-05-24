import { z } from "zod";

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
  aduSqFt: z.coerce.number().min(150).max(1200),
  buildCostPerSqFt: z.coerce.number().min(150).max(900),
  softCostRate: z.coerce.number().min(0).max(0.45),
  contingencyRate: z.coerce.number().min(0).max(0.35),
  monthlyRent: z.coerce.number().min(500).max(9000),
  opExRate: z.coerce.number().min(0.05).max(0.55),
  capRate: z.coerce.number().min(0.025).max(0.12),
});

export const designConceptSchema = z.object({
  title: z.string(),
  exteriorStyle: z.string(),
  footprintType: z.string(),
  targetSqFt: z.number(),
  rooms: z.array(z.string()),
  constraints: z.array(z.string()),
  nextSteps: z.array(z.string()),
  thumbnailPrompt: z.string(),
});

export const designPlacementSchema = z.object({
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  rotation: z.number().min(-45).max(45),
});

export const designFitSignalSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  status: z.enum(["good", "review", "blocked"]),
});

export const designConceptPreferencesSchema = z.object({
  styleId: designStyleIdSchema.optional(),
  styleLabel: z.string().optional(),
  modelId: z.string().optional(),
  modelName: z.string().optional(),
  constructionMethod: z.enum(["prefab", "modular", "site_built", "conversion"]).optional(),
  targetSqFt: z.number().min(150).max(1200).optional(),
  placement: designPlacementSchema.optional(),
  fitSignals: z.array(designFitSignalSchema).max(8).optional(),
  hasSitePhoto: z.boolean().optional(),
});

export type EstimateInputForm = z.infer<typeof estimateInputSchema>;
