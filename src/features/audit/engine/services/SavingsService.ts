/**
 * Savings Engine — Deterministic savings calculations.
 *
 * Takes audit items + rule results and computes final savings figures.
 * Uses per-tool deduplication to avoid double-counting savings.
 */

import { SavingsResult, RuleResult } from '../types';
import { AuditItemInput } from '../types/audit-input';

export class SavingsService {
  /**
   * Calculate total savings from a set of recommendations.
   *
   * Deduplicates overlapping savings at the individual tool level.
   * For each tool, only the maximum savings from any rule is counted.
   * This prevents double-counting when multiple rules affect the same tool.
   *
   * Additionally, savings per tool are capped at that tool's monthly spend
   * to prevent over-counting (can't save more on a tool than you pay for it).
   */
  calculateSavings(items: AuditItemInput[], recommendations: RuleResult[]): SavingsResult {
    const currentMonthlySpend = items.reduce((sum, i) => sum + i.monthlySpend, 0);

    if (recommendations.length === 0) {
      return {
        currentMonthlySpend,
        optimizedMonthlySpend: currentMonthlySpend,
        monthlySavings: 0,
        annualSavings: 0,
        savingsPercentage: 0,
        confidenceScore: 1.0,
      };
    }

    // Build a map of max savings per individual tool
    const perToolSavings = new Map<string, number>();
    const toolSpendMap = new Map<string, number>();

    // Index tool spends
    for (const item of items) {
      toolSpendMap.set(item.toolId, item.monthlySpend);
    }

    for (const rec of recommendations) {
      if (rec.expectedMonthlySavings <= 0) continue;

      // Distribute savings proportionally across affected tools
      const affectedCount = rec.affectedToolIds.length;
      const perToolShare = rec.expectedMonthlySavings / affectedCount;

      for (const toolId of rec.affectedToolIds) {
        const existing = perToolSavings.get(toolId) ?? 0;
        perToolSavings.set(toolId, Math.max(existing, perToolShare));
      }
    }

    // Sum per-tool savings, capped at each tool's actual spend
    let totalMonthlySavings = 0;
    for (const [toolId, savings] of perToolSavings) {
      const toolSpend = toolSpendMap.get(toolId) ?? 0;
      totalMonthlySavings += Math.min(savings, toolSpend);
    }

    // Global cap: can't save more than 85% of total spend
    // (you'll always keep at least one tool)
    const maxSavings = currentMonthlySpend * 0.85;
    totalMonthlySavings = Math.min(totalMonthlySavings, maxSavings);
    totalMonthlySavings = Math.round(totalMonthlySavings * 100) / 100;

    const optimizedMonthlySpend = Math.round((currentMonthlySpend - totalMonthlySavings) * 100) / 100;
    const annualSavings = Math.round(totalMonthlySavings * 12 * 100) / 100;
    const savingsPercentage =
      currentMonthlySpend > 0
        ? Math.round((totalMonthlySavings / currentMonthlySpend) * 10000) / 100
        : 0;

    // Confidence is the weighted average of recommendation confidences
    const activeRecs = recommendations.filter(r => r.expectedMonthlySavings > 0);
    const totalConfidence = activeRecs.length > 0
      ? activeRecs.reduce((sum, r) => sum + r.confidenceScore * r.expectedMonthlySavings, 0) /
        activeRecs.reduce((sum, r) => sum + r.expectedMonthlySavings, 0)
      : 1.0;

    return {
      currentMonthlySpend: Math.round(currentMonthlySpend * 100) / 100,
      optimizedMonthlySpend,
      monthlySavings: totalMonthlySavings,
      annualSavings,
      savingsPercentage,
      confidenceScore: Math.round(totalConfidence * 100) / 100,
    };
  }
}

export const savingsService = new SavingsService();
