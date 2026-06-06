import { z } from 'zod';

/**
 * A single tool subscription entry in an audit.
 */
export const auditItemInputSchema = z.object({
  toolId: z.string().min(1, 'toolId is required'),
  planName: z.string().min(1, 'planName is required'),
  monthlySpend: z.number().min(0, 'monthlySpend must be >= 0'),
  seatCount: z.number().int().min(1, 'seatCount must be at least 1'),
  teamSize: z.number().int().min(1, 'teamSize must be at least 1'),
  useCase: z.enum(['coding', 'writing', 'research', 'data', 'mixed']),
});

export type AuditItemInput = z.infer<typeof auditItemInputSchema>;

/**
 * The full audit request payload — a list of tool subscriptions.
 */
export const auditRequestSchema = z.object({
  companyId: z.string().min(1, 'companyId is required'),
  items: z.array(auditItemInputSchema).min(1, 'At least one tool subscription is required'),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;

/**
 * Validates an audit request payload. Returns parsed data or throws.
 */
export function validateAuditRequest(data: unknown): AuditRequest {
  return auditRequestSchema.parse(data);
}

/**
 * Validates a single audit item. Returns parsed data or throws.
 */
export function validateAuditItem(data: unknown): AuditItemInput {
  return auditItemInputSchema.parse(data);
}
