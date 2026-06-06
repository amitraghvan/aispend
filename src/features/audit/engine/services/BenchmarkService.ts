/**
 * Benchmark Engine
 *
 * Compares company AI spend against industry benchmarks.
 * Benchmarks are based on aggregated startup data patterns.
 */

import { BenchmarkResult } from '../types';
import { AuditItemInput } from '../types/audit-input';

// Industry benchmark data (compiled from industry reports)
// Spend per employee per month by company stage
const BENCHMARKS = {
  // Startups (1-50 employees)
  startup: {
    low: 10,     // $10/employee/mo (efficient)
    median: 25,  // $25/employee/mo (average)
    high: 50,    // $50/employee/mo (above average)
    veryHigh: 100, // $100/employee/mo (excessive)
  },
  // Scale-ups (51-200 employees)
  scaleup: {
    low: 15,
    median: 35,
    high: 60,
    veryHigh: 120,
  },
  // Enterprise (201+ employees)
  enterprise: {
    low: 20,
    median: 45,
    high: 80,
    veryHigh: 150,
  },
} as const;

type CompanyStage = keyof typeof BENCHMARKS;

export class BenchmarkService {
  /**
   * Calculate benchmark analysis for a company's AI spend.
   */
  calculate(
    items: AuditItemInput[],
    totalEmployees: number,
    totalDevelopers?: number
  ): BenchmarkResult {
    const totalMonthlySpend = items.reduce((sum, i) => sum + i.monthlySpend, 0);

    if (totalEmployees <= 0) {
      return {
        spendPerEmployee: 0,
        spendPerDeveloper: null,
        percentile: 50,
        optimizationRating: 'average',
        industryAverage: 25,
        explanation: 'Unable to calculate benchmarks without employee count.',
      };
    }

    const spendPerEmployee = Math.round((totalMonthlySpend / totalEmployees) * 100) / 100;
    const spendPerDeveloper =
      totalDevelopers && totalDevelopers > 0
        ? Math.round((totalMonthlySpend / totalDevelopers) * 100) / 100
        : null;

    const stage = this.getCompanyStage(totalEmployees);
    const benchmark = BENCHMARKS[stage];
    const percentile = this.calculatePercentile(spendPerEmployee, benchmark);
    const optimizationRating = this.getOptimizationRating(percentile);

    const explanation = this.generateExplanation(
      spendPerEmployee,
      spendPerDeveloper,
      percentile,
      optimizationRating,
      stage,
      benchmark.median,
      totalMonthlySpend,
      totalEmployees
    );

    return {
      spendPerEmployee,
      spendPerDeveloper,
      percentile,
      optimizationRating,
      industryAverage: benchmark.median,
      explanation,
    };
  }

  private getCompanyStage(employees: number): CompanyStage {
    if (employees <= 50) return 'startup';
    if (employees <= 200) return 'scaleup';
    return 'enterprise';
  }

  /**
   * Calculate percentile using linear interpolation against benchmarks.
   * Higher percentile = higher spend (worse).
   */
  private calculatePercentile(
    spendPerEmployee: number,
    benchmark: (typeof BENCHMARKS)[CompanyStage]
  ): number {
    if (spendPerEmployee <= benchmark.low) {
      // 0–25th percentile (very efficient)
      return Math.round((spendPerEmployee / benchmark.low) * 25);
    }
    if (spendPerEmployee <= benchmark.median) {
      // 25–50th percentile
      const range = benchmark.median - benchmark.low;
      const offset = spendPerEmployee - benchmark.low;
      return Math.round(25 + (offset / range) * 25);
    }
    if (spendPerEmployee <= benchmark.high) {
      // 50–75th percentile
      const range = benchmark.high - benchmark.median;
      const offset = spendPerEmployee - benchmark.median;
      return Math.round(50 + (offset / range) * 25);
    }
    if (spendPerEmployee <= benchmark.veryHigh) {
      // 75–95th percentile
      const range = benchmark.veryHigh - benchmark.high;
      const offset = spendPerEmployee - benchmark.high;
      return Math.round(75 + (offset / range) * 20);
    }
    // 95–100th percentile
    return Math.min(100, Math.round(95 + ((spendPerEmployee - benchmark.veryHigh) / benchmark.veryHigh) * 5));
  }

  private getOptimizationRating(percentile: number): string {
    if (percentile <= 20) return 'excellent';
    if (percentile <= 40) return 'good';
    if (percentile <= 60) return 'average';
    if (percentile <= 80) return 'below_average';
    return 'poor';
  }

  private generateExplanation(
    spendPerEmployee: number,
    spendPerDeveloper: number | null,
    percentile: number,
    rating: string,
    stage: CompanyStage,
    industryMedian: number,
    totalSpend: number,
    totalEmployees: number
  ): string {
    const stageLabel = stage === 'startup' ? 'startups' : stage === 'scaleup' ? 'scale-ups' : 'enterprises';
    const vsMedian =
      spendPerEmployee > industryMedian
        ? `${Math.round(((spendPerEmployee - industryMedian) / industryMedian) * 100)}% above`
        : spendPerEmployee < industryMedian
        ? `${Math.round(((industryMedian - spendPerEmployee) / industryMedian) * 100)}% below`
        : 'at';

    let summary = `Your AI spend of $${spendPerEmployee}/employee/mo is ${vsMedian} the industry median for ${stageLabel} ($${industryMedian}/employee/mo). `;
    summary += `This places you at the ${percentile}th percentile (${rating.replace('_', ' ')}). `;

    if (spendPerDeveloper !== null) {
      summary += `Per-developer AI spend: $${spendPerDeveloper}/mo. `;
    }

    summary += `Total: $${totalSpend}/mo across ${totalEmployees} employees.`;

    return summary;
  }
}

export const benchmarkService = new BenchmarkService();
