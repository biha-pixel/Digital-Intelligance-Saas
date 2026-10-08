import { z } from "zod";
import { sourceTypeSchema } from "./source";

export const sentimentLabelSchema = z.enum([
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "MIXED",
]);

export const intentEnumSchema = z.enum([
  "PRAISE",
  "COMPLAINT",
  "FEATURE_REQUEST",
  "CHURN_RISK",
  "QUESTION",
  "OTHER",
]);

export const feedbackItemSchema = z.object({
  sourceId: z.string().uuid("Source ID must be a valid UUID"),
  rawScrapeId: z.string().uuid().optional().nullable(),
  authorIdentifier: z
    .string()
    .min(10, "Author identifier must be a valid SHA-256 hash or pseudonym"),
  postedAt: z.string().datetime({ offset: true }).optional().nullable(),
  contentText: z.string().min(1, "Feedback content text is required"),
  rating: z.number().min(1).max(5).optional().nullable(),
  languageCode: z.string().min(2).max(5).default("en"),
  sourceType: sourceTypeSchema,
  wordCount: z.number().int().min(0).optional(),
  contentHash: z
    .string()
    .length(64, "Content hash must be a 64-character SHA-256 hexadecimal string"),
  sentimentLabel: sentimentLabelSchema.optional().nullable(),
  sentimentScore: z.number().min(-1).max(1).optional().nullable(),
  topics: z.array(z.string()).default([]),
  intent: intentEnumSchema.optional().nullable(),
  keyEntities: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const feedbackQuerySchema = z.object({
  sourceId: z.string().uuid().optional(),
  sourceType: sourceTypeSchema.optional(),
  sentiment: sentimentLabelSchema.optional(),
  intent: intentEnumSchema.optional(),
  ratingMin: z.number().min(1).max(5).optional(),
  ratingMax: z.number().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(),
});

export type FeedbackItemInput = z.infer<typeof feedbackItemSchema>;
export type FeedbackQueryInput = z.infer<typeof feedbackQuerySchema>;
