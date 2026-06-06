/**
 * Tool Catalog Type Definitions
 * Canonical types for AI tool pricing, plans, and metadata.
 */

export type UseCase = 'coding' | 'writing' | 'research' | 'data' | 'mixed';

export type ToolVendor =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google'
  | 'GitHub'
  | 'Cursor'
  | 'Codeium'
  | 'Vercel';

export interface ToolPlan {
  planId: string;
  planName: string;
  monthlyPricePerSeat: number;
  annualPricePerSeat: number | null;
  seatMinimum: number;
  seatMaximum: number | null;
  features: string[];
}

export interface ToolCatalogEntry {
  toolId: string;
  toolName: string;
  vendor: ToolVendor;
  category: UseCase;
  plans: ToolPlan[];
  targetUsers: string[];
  useCases: UseCase[];
  pricingSource: string;
  pricingVerifiedAt: string;
  alternativeToolIds: string[];
}

export interface ToolCatalogMap {
  [toolId: string]: ToolCatalogEntry;
}
