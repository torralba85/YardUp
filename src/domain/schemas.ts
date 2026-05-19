import { z } from "zod";

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

export type EstimateInputForm = z.infer<typeof estimateInputSchema>;
