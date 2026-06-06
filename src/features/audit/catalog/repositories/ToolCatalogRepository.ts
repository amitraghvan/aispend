import { TOOL_CATALOG, TOOL_LIST, SUPPORTED_TOOL_IDS } from '../data/tool-catalog';
import { ToolCatalogEntry, ToolPlan, UseCase } from '../types';
import { NotFoundError } from '@/lib/errors/AppError';

export class ToolCatalogRepository {
  /**
   * Get a tool by its ID. Throws if not found.
   */
  getById(toolId: string): ToolCatalogEntry {
    const entry = TOOL_CATALOG[toolId];
    if (!entry) {
      throw new NotFoundError(`Tool "${toolId}" not found in catalog.`, { toolId });
    }
    return entry;
  }

  /**
   * Get a tool by ID, returns null if not found.
   */
  findById(toolId: string): ToolCatalogEntry | null {
    return TOOL_CATALOG[toolId] ?? null;
  }

  /**
   * Check if a tool exists in the catalog.
   */
  exists(toolId: string): boolean {
    return toolId in TOOL_CATALOG;
  }

  /**
   * Get a specific plan for a tool. Throws if either tool or plan not found.
   */
  getPlan(toolId: string, planId: string): ToolPlan {
    const tool = this.getById(toolId);
    const plan = tool.plans.find((p) => p.planId === planId);
    if (!plan) {
      throw new NotFoundError(`Plan "${planId}" not found for tool "${toolId}".`, { toolId, planId });
    }
    return plan;
  }

  /**
   * Find the plan that best matches a given plan name (case-insensitive).
   */
  findPlanByName(toolId: string, planName: string): ToolPlan | null {
    const tool = this.findById(toolId);
    if (!tool) return null;
    const normalized = planName.toLowerCase().trim();
    return tool.plans.find((p) => p.planName.toLowerCase() === normalized) ?? null;
  }

  /**
   * Get all tools matching a specific use case.
   */
  getByUseCase(useCase: UseCase): ToolCatalogEntry[] {
    return TOOL_LIST.filter((entry) => entry.useCases.includes(useCase));
  }

  /**
   * Get all tools in a specific category.
   */
  getByCategory(category: UseCase): ToolCatalogEntry[] {
    return TOOL_LIST.filter((entry) => entry.category === category);
  }

  /**
   * Get alternatives for a given tool.
   */
  getAlternatives(toolId: string): ToolCatalogEntry[] {
    const tool = this.getById(toolId);
    return tool.alternativeToolIds
      .map((altId) => this.findById(altId))
      .filter((entry): entry is ToolCatalogEntry => entry !== null);
  }

  /**
   * Get all catalog entries.
   */
  getAll(): readonly ToolCatalogEntry[] {
    return TOOL_LIST;
  }

  /**
   * Get all supported tool IDs.
   */
  getSupportedToolIds(): readonly string[] {
    return SUPPORTED_TOOL_IDS;
  }

  /**
   * Find the cheapest non-free plan for a tool.
   */
  getCheapestPaidPlan(toolId: string): ToolPlan | null {
    const tool = this.getById(toolId);
    const paidPlans = tool.plans.filter((p) => p.monthlyPricePerSeat > 0);
    if (paidPlans.length === 0) return null;
    return paidPlans.reduce((cheapest, plan) =>
      plan.monthlyPricePerSeat < cheapest.monthlyPricePerSeat ? plan : cheapest
    );
  }
}

export const toolCatalogRepository = new ToolCatalogRepository();
