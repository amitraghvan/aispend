/**
 * Health Score Engine
 *
 * Computes a 0–100 health score with subscores and letter grades.
 * Scoring is deterministic and based on objective metrics.
 */

import { HealthScoreResult, HealthSubScore, RuleResult, OverlapAnalysis } from '../types';
import { AuditItemInput } from '../types/audit-input';

export class HealthScoreService {
  /**
   * Calculate the overall health score for an AI spend portfolio.
   */
  calculate(
    items: AuditItemInput[],
    recommendations: RuleResult[],
    overlapAnalysis: OverlapAnalysis,
    savingsPercentage: number
  ): HealthScoreResult {
    const subscores: HealthSubScore[] = [
      this.calculateSpendEfficiency(items, savingsPercentage),
      this.calculateToolConsolidation(items, overlapAnalysis),
      this.calculateSeatUtilization(items),
      this.calculatePlanAlignment(items, recommendations),
      this.calculateCriticalIssues(recommendations),
    ];

    // Weighted average
    const totalWeight = subscores.reduce((sum, s) => sum + s.weight, 0);
    const overallScore = Math.round(
      subscores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight
    );

    const grade = this.scoreToGrade(overallScore);
    const summary = this.generateSummary(overallScore, grade, subscores);

    return { overallScore, grade, subscores, summary };
  }

  /**
   * Spend Efficiency: How much potential savings exist?
   * 100 = no savings possible (perfectly optimized)
   * 0 = massive savings possible (highly wasteful)
   */
  private calculateSpendEfficiency(items: AuditItemInput[], savingsPercentage: number): HealthSubScore {
    const score = Math.max(0, Math.round(100 - savingsPercentage * 2));
    let explanation: string;

    if (savingsPercentage <= 5) {
      explanation = 'Your AI spend is highly optimized with minimal savings opportunities.';
    } else if (savingsPercentage <= 15) {
      explanation = 'Good spend efficiency with some room for optimization.';
    } else if (savingsPercentage <= 30) {
      explanation = 'Moderate spend inefficiency detected. Several optimization opportunities exist.';
    } else {
      explanation = 'Significant spend waste detected. Immediate optimization recommended.';
    }

    return { name: 'Spend Efficiency', score, weight: 0.30, explanation };
  }

  /**
   * Tool Consolidation: How much overlap exists?
   * 100 = no overlap (each tool serves a unique purpose)
   * 0 = extreme overlap (many redundant tools)
   */
  private calculateToolConsolidation(items: AuditItemInput[], overlap: OverlapAnalysis): HealthSubScore {
    const overlapPenalty = overlap.totalOverlapScore;
    const score = Math.max(0, 100 - overlapPenalty);
    let explanation: string;

    if (overlap.overlapGroups.length === 0) {
      explanation = 'No tool overlap detected. Each tool serves a distinct purpose.';
    } else if (overlap.overlapGroups.length <= 2) {
      explanation = `${overlap.overlapGroups.length} area(s) of tool overlap detected. Minor consolidation possible.`;
    } else {
      explanation = `${overlap.overlapGroups.length} areas of tool overlap detected. Significant consolidation recommended.`;
    }

    return { name: 'Tool Consolidation', score, weight: 0.25, explanation };
  }

  /**
   * Seat Utilization: Are seats being used efficiently?
   * 100 = all seats matched to team size
   * 0 = massive over-provisioning
   */
  private calculateSeatUtilization(items: AuditItemInput[]): HealthSubScore {
    if (items.length === 0) {
      return { name: 'Seat Utilization', score: 100, weight: 0.20, explanation: 'No subscriptions to evaluate.' };
    }

    const totalSeats = items.reduce((sum, i) => sum + i.seatCount, 0);
    const totalTeamSize = items.reduce((sum, i) => sum + i.teamSize, 0);

    let score: number;
    if (totalSeats <= totalTeamSize) {
      score = 100; // Perfect or under-provisioned
    } else {
      const utilizationRate = totalTeamSize / totalSeats;
      score = Math.max(0, Math.round(utilizationRate * 100));
    }

    let explanation: string;
    if (score >= 90) {
      explanation = 'Excellent seat utilization. All seats are allocated to active team members.';
    } else if (score >= 70) {
      explanation = 'Good seat utilization with minor over-provisioning.';
    } else if (score >= 50) {
      explanation = 'Moderate seat under-utilization. Review seat assignments.';
    } else {
      explanation = `Poor seat utilization (${totalSeats} seats for ${totalTeamSize} users). Significant over-provisioning.`;
    }

    return { name: 'Seat Utilization', score, weight: 0.20, explanation };
  }

  /**
   * Plan Alignment: Are teams on the right plan tier?
   * Penalized for plan downgrade recommendations.
   */
  private calculatePlanAlignment(items: AuditItemInput[], recommendations: RuleResult[]): HealthSubScore {
    const planIssues = recommendations.filter(
      (r) => r.category === 'plan_downgrade' || r.category === 'feature_alignment'
    );

    const score = Math.max(0, 100 - planIssues.length * 15);
    let explanation: string;

    if (planIssues.length === 0) {
      explanation = 'All tools are on appropriately-sized plans.';
    } else if (planIssues.length <= 2) {
      explanation = `${planIssues.length} plan alignment issue(s) found. Minor plan adjustments recommended.`;
    } else {
      explanation = `${planIssues.length} plan alignment issues found. Multiple tools are on oversized plans.`;
    }

    return { name: 'Plan Alignment', score, weight: 0.15, explanation };
  }

  /**
   * Critical Issues: Are there any critical-priority recommendations?
   * Heavy penalty for critical issues.
   */
  private calculateCriticalIssues(recommendations: RuleResult[]): HealthSubScore {
    const critical = recommendations.filter((r) => r.priority === 'critical');
    const high = recommendations.filter((r) => r.priority === 'high');

    const score = Math.max(0, 100 - critical.length * 25 - high.length * 10);
    let explanation: string;

    if (critical.length === 0 && high.length === 0) {
      explanation = 'No critical or high-priority issues detected.';
    } else if (critical.length === 0) {
      explanation = `${high.length} high-priority issue(s) found. Review recommended.`;
    } else {
      explanation = `${critical.length} critical issue(s) and ${high.length} high-priority issue(s) found. Immediate action needed.`;
    }

    return { name: 'Critical Issues', score, weight: 0.10, explanation };
  }

  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateSummary(score: number, grade: string, subscores: HealthSubScore[]): string {
    const weakest = subscores.reduce((min, s) => (s.score < min.score ? s : min));
    const strongest = subscores.reduce((max, s) => (s.score > max.score ? s : max));

    if (score >= 90) {
      return `Excellent AI spend health (${grade}). Your portfolio is well-optimized. Strongest area: ${strongest.name}.`;
    }
    if (score >= 70) {
      return `Good AI spend health (${grade}). Some optimization opportunities exist. Focus on: ${weakest.name}.`;
    }
    if (score >= 50) {
      return `Fair AI spend health (${grade}). Multiple areas need attention. Weakest area: ${weakest.name}. Strongest: ${strongest.name}.`;
    }
    return `Poor AI spend health (${grade}). Significant optimization needed across multiple areas. Most urgent: ${weakest.name}.`;
  }
}

export const healthScoreService = new HealthScoreService();
