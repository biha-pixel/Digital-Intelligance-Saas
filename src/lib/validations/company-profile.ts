import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().min(1, "City is required"),
  region: z.string().optional(),
  country: z.string().min(2, "Country code must be at least 2 characters"),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const socialHandlesSchema = z.object({
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  github: z.string().optional(),
});

export const companyProfileSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
  primaryDomain: z
    .string()
    .min(3, "Domain is required")
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Please enter a valid domain name (e.g. acme.com)"
    ),
  country: z.string().length(2, "Country code must be 2 letters (ISO-3166-1)").optional(),
  locations: z.array(locationSchema).default([]),
  industry: z.string().max(60).optional(),
  aliases: z.array(z.string().min(1).max(100)).default([]),
  socialHandles: socialHandlesSchema.default({}),
});

export const updateCompanyProfileSchema = companyProfileSchema.partial();

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SocialHandlesInput = z.infer<typeof socialHandlesSchema>;
