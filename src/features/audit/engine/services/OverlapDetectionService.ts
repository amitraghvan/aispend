/**
 * Overlap Detection Service
 *
 * Detects tool overlap by use case and generates consolidation recommendations.
 */

import { OverlapGroup, OverlapAnalysis } from '../types';
import { AuditItemInput } from '../types/audit-input';
import { toolCatalogRepository } from '../../catalog/repositories/ToolCatalogRepository';

const CODING_TOOL_IDS = new Set(['cursor', 'github-copilot', 'windsurf', 'v0']);
const GENERAL_AI_IDS = new Set(['chatgpt', 'claude', 'gemini']);

export class OverlapDetectionService {
  /**
   * Analyze all audit items for tool overlap.
   */
  analyze(items: AuditItemInput[]): OverlapAnalysis {
    const groups: OverlapGroup[] = [];

    // 1. Check coding tool overlap
    const codingOverlap = this.detectCategoryOverlap(items, CODING_TOOL_IDS, 'coding');
    if (codingOverlap) groups.push(codingOverlap);

    // 2. Check general AI overlap
    const generalOverlap = this.detectCategoryOverlap(items, GENERAL_AI_IDS, 'general_ai');
    if (generalOverlap) groups.push(generalOverlap);

    // 3. Check per-use-case overlap
    const useCases = ['writing', 'research', 'data', 'coding', 'mixed'] as const;
    for (const uc of useCases) {
      const ucOverlap = this.detectUseCaseOverlap(items, uc);
      if (ucOverlap) groups.push(ucOverlap);
    }

    // 4. Check API + subscription overlap
    const apiSubOverlap = this.detectApiSubscriptionOverlap(items);
    groups.push(...apiSubOverlap);

    // Deduplicate groups by tool set
    const deduped = this.deduplicateGroups(groups);

    // Calculate totals
    const totalOverlapScore =
      deduped.length > 0
        ? Math.round(deduped.reduce((sum, g) => sum + g.overlapScore, 0) / deduped.length)
        : 0;
    const totalRedundancyScore =
      deduped.length > 0
        ? Math.round(deduped.reduce((sum, g) => sum + g.redundancyScore, 0) / deduped.length)
        : 0;
    const totalEstimatedSavings = deduped.reduce((sum, g) => sum + g.estimatedSavings, 0);

    return {
      overlapGroups: deduped,
      totalOverlapScore,
      totalRedundancyScore,
      totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    };
  }

  private detectCategoryOverlap(
    items: AuditItemInput[],
    toolSet: Set<string>,
    label: string
  ): OverlapGroup | null {
    const matching = items.filter((i) => toolSet.has(i.toolId) && i.monthlySpend > 0);
    if (matching.length < 2) return null;

    const combinedSpend = matching.reduce((sum, i) => sum + i.monthlySpend, 0);
    const cheapest = matching.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
    const overlapScore = Math.min(100, Math.round((matching.length / toolSet.size) * 100));
    const redundancyScore = Math.min(100, Math.round(((combinedSpend - cheapest.monthlySpend) / combinedSpend) * 100));

    return {
      useCase: label,
      toolIds: matching.map((i) => i.toolId),
      toolNames: matching.map((i) => {
        const entry = toolCatalogRepository.findById(i.toolId);
        return entry?.toolName ?? i.toolId;
      }),
      combinedMonthlySpend: Math.round(combinedSpend * 100) / 100,
      overlapScore,
      redundancyScore,
      consolidationSuggestion: `Consolidate to ${cheapest.toolId} (cheapest at $${cheapest.monthlySpend}/mo)`,
      estimatedSavings: Math.round((combinedSpend - cheapest.monthlySpend) * 100) / 100,
    };
  }

  private detectUseCaseOverlap(items: AuditItemInput[], useCase: string): OverlapGroup | null {
    const matching = items.filter((i) => i.useCase === useCase && i.monthlySpend > 0);
    if (matching.length < 2) return null;

    // Only flag if tools are from different categories
    const uniqueTools = new Set(matching.map((i) => i.toolId));
    if (uniqueTools.size < 2) return null;

    const combinedSpend = matching.reduce((sum, i) => sum + i.monthlySpend, 0);
    const cheapest = matching.reduce((min, i) => (i.monthlySpend < min.monthlySpend ? i : min));
    const overlapScore = Math.min(100, Math.round((matching.length * 25)));
    const redundancyScore = Math.min(100, Math.round(((combinedSpend - cheapest.monthlySpend) / combinedSpend) * 100));

    return {
      useCase,
      toolIds: matching.map((i) => i.toolId),
      toolNames: matching.map((i) => {
        const entry = toolCatalogRepository.findById(i.toolId);
        return entry?.toolName ?? i.toolId;
      }),
      combinedMonthlySpend: Math.round(combinedSpend * 100) / 100,
      overlapScore,
      redundancyScore,
      consolidationSuggestion: `Standardize on ${cheapest.toolId} for "${useCase}" tasks.`,
      estimatedSavings: Math.round((combinedSpend - cheapest.monthlySpend) * 100) / 100,
    };
  }

  private detectApiSubscriptionOverlap(items: AuditItemInput[]): OverlapGroup[] {
    const groups: OverlapGroup[] = [];

    // OpenAI API + ChatGPT
    const openaiApi = items.find((i) => i.toolId === 'openai-api' && i.monthlySpend > 0);
    const chatgpt = items.find((i) => i.toolId === 'chatgpt' && i.monthlySpend > 0);
    if (openaiApi && chatgpt) {
      const combinedSpend = openaiApi.monthlySpend + chatgpt.monthlySpend;
      const cheaper = openaiApi.monthlySpend < chatgpt.monthlySpend ? openaiApi : chatgpt;
      groups.push({
        useCase: 'openai_ecosystem',
        toolIds: ['openai-api', 'chatgpt'],
        toolNames: ['OpenAI API', 'ChatGPT'],
        combinedMonthlySpend: combinedSpend,
        overlapScore: 60,
        redundancyScore: 40,
        consolidationSuggestion: `Evaluate if both API and subscription are needed. For interactive use: keep ChatGPT. For programmatic: keep API.`,
        estimatedSavings: cheaper.monthlySpend,
      });
    }

    // Anthropic API + Claude
    const anthropicApi = items.find((i) => i.toolId === 'anthropic-api' && i.monthlySpend > 0);
    const claude = items.find((i) => i.toolId === 'claude' && i.monthlySpend > 0);
    if (anthropicApi && claude) {
      const combinedSpend = anthropicApi.monthlySpend + claude.monthlySpend;
      const cheaper = anthropicApi.monthlySpend < claude.monthlySpend ? anthropicApi : claude;
      groups.push({
        useCase: 'anthropic_ecosystem',
        toolIds: ['anthropic-api', 'claude'],
        toolNames: ['Anthropic API', 'Claude'],
        combinedMonthlySpend: combinedSpend,
        overlapScore: 60,
        redundancyScore: 40,
        consolidationSuggestion: `Evaluate if both API and subscription are needed.`,
        estimatedSavings: cheaper.monthlySpend,
      });
    }

    return groups;
  }

  private deduplicateGroups(groups: OverlapGroup[]): OverlapGroup[] {
    const seen = new Set<string>();
    const result: OverlapGroup[] = [];

    for (const group of groups) {
      const key = group.toolIds.sort().join('|') + ':' + group.useCase;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(group);
      }
    }

    return result;
  }
}

export const overlapDetectionService = new OverlapDetectionService();
