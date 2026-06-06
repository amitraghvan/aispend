/**
 * Savings Engine — Deterministic savings calculations.
 *
 * Takes audit items + rule results and computes final savings figures.
 */

import { SavingsResult, RuleResult } from '../types';
import { AuditItemInput } from '../types/audit-input';

export class SavingsService {
  /**
   * Calculate total savings from a set of recommendations.
   *
   * Deduplicates overlapping savings when multiple rules affect the same tools.
   * Uses a conservative approach: for tools affected by multiple rules,
   * takes the maximum savings (not the sum) to avoid double-counting.
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

    // Group recommendations by the set of affected tools to detect overlaps
    const toolSavingsMap = new Map<string, number>();

    for (const rec of recommendations) {
      // For each affected tool, track the max savings from any single rule
      const key = rec.affectedToolIds.sort().join('|');
      const existing = toolSavingsMap.get(key) ?? 0;
      toolSavingsMap.set(key, Math.max(existing, rec.expectedMonthlySavings));
    }

    // Sum the de-duplicated maximum savings per tool group
    let totalMonthlySavings = 0;
    for (const savings of toolSavingsMap.values()) {
      totalMonthlySavings += savings;
    }

    // Cap savings at current spend (can't save more than you spend)
    totalMonthlySavings = Math.min(totalMonthlySavings, currentMonthlySpend);
    totalMonthlySavings = Math.round(totalMonthlySavings * 100) / 100;

    const optimizedMonthlySpend = Math.round((currentMonthlySpend - totalMonthlySavings) * 100) / 100;
    const annualSavings = Math.round(totalMonthlySavings * 12 * 100) / 100;
    const savingsPercentage =
      currentMonthlySpend > 0
        ? Math.round((totalMonthlySavings / currentMonthlySpend) * 10000) / 100
        : 0;

    // Confidence is the weighted average of recommendation confidences
    const totalConfidence =
      recommendations.reduce((sum, r) => sum + r.confidenceScore * r.expectedMonthlySavings, 0) /
      recommendations.reduce((sum, r) => sum + r.expectedMonthlySavings, 0);

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
