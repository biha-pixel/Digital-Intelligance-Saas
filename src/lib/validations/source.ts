import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "google_maps",
  "trustpilot",
  "yelp",
  "g2",
  "capterra",
  "app_store",
  "play_store",
  "reddit",
  "generic_web",
]);

export const sourceOwnershipSchema = z.enum([
  "owned",
  "competitor",
  "unclaimed",
]);

export const verificationStatusSchema = z.enum([
  "unverified",
  "verified_auto",
  "verified_manual",
  "rejected",
]);

export const registerSourceSchema = z.object({
  companyProfileId: z.string().uuid().optional(),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "Only HTTP and HTTPS protocols are supported"),
  sourceType: sourceTypeSchema,
  ownership: sourceOwnershipSchema.default("owned"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(120, "Display name must be less than 120 characters"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  confidenceScore: z.number().min(0).max(1).default(1.0),
});

export const updateSourceSchema = z.object({
  displayName: z.string().min(2).max(120).optional(),
  verificationStatus: verificationStatusSchema.optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
});

export type RegisterSourceInput = z.infer<typeof registerSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
