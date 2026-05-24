import { z } from "zod";

export const feedbackCategorySchema = z.enum([
  "general",
  "bug",
  "feature_request",
  "data_issue",
  "other",
]);

export const submitFeedbackInputSchema = z.object({
  category: feedbackCategorySchema,
  message: z
    .string()
    .min(5, "Feedback message must be at least 5 characters.")
    .max(1000, "Feedback message cannot exceed 1000 characters."),
  rating: z.number().int().min(1).max(5).optional(),
  pageIdentifier: z.string().max(200).optional(),
  clientVersion: z.string().max(50).optional(),
  deviceInfo: z
    .object({
      os: z.string().max(50).optional(),
      osVersion: z.string().max(50).optional(),
      model: z.string().max(100).optional(),
      brand: z.string().max(100).optional(),
    })
    .optional(),
});

export type FeedbackInput = z.infer<typeof submitFeedbackInputSchema>;

export interface FeedbackRecord extends FeedbackInput {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: "new" | "reviewed" | "archived";
}
