import { z } from 'zod';

export const useCaseSchema = z.enum(['coding', 'writing', 'research', 'data', 'mixed']);

export const toolPlanSchema = z.object({
  planId: z.string().min(1),
  planName: z.string().min(1),
  monthlyPricePerSeat: z.number().min(0),
  annualPricePerSeat: z.number().min(0).nullable(),
  seatMinimum: z.number().int().min(1),
  seatMaximum: z.number().int().min(1).nullable(),
  features: z.array(z.string()),
});

export const toolCatalogEntrySchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
  vendor: z.string().min(1),
  category: useCaseSchema,
  plans: z.array(toolPlanSchema).min(1),
  targetUsers: z.array(z.string()).min(1),
  useCases: z.array(useCaseSchema).min(1),
  pricingSource: z.string().url(),
  pricingVerifiedAt: z.string(),
  alternativeToolIds: z.array(z.string()),
});

export type ValidatedToolCatalogEntry = z.infer<typeof toolCatalogEntrySchema>;
