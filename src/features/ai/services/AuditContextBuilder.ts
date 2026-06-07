import { Audit, AuditItem, Recommendation } from '@prisma/client';

export interface AuditWithRelations extends Audit {
  items: AuditItem[];
  recommendations: Recommendation[];
}

export class AuditContextBuilder {
  static build(audit: AuditWithRelations): string {
    const healthScore = audit.healthScore ?? 100;
    const healthGrade = audit.healthGrade ?? 'A';
    const totalSpend = Number(audit.totalSpend);
    const optimizedSpend = audit.optimizedSpend ? Number(audit.optimizedSpend) : totalSpend;
    const potentialSavings = Number(audit.potentialSavings);
    const savingsPercentage = audit.savingsPercentage ? Number(audit.savingsPercentage) : 0;
    const toolCount = audit.toolCount;
    const itemCount = audit.itemCount;

    let context = `=== AUDIT METRICS ===
- Audit ID Reference: ${audit.id.slice(0, 8)}
- Health Score: ${healthScore}/100 (${healthGrade})
- Total Spend Amount: $${totalSpend}/mo
- Optimized Spend Amount: $${optimizedSpend}/mo
- Potential Monthly Savings: $${potentialSavings}/mo
- Savings Percentage: ${savingsPercentage.toFixed(1)}%
- Unique Software Tools: ${toolCount}
- Monitored Accounts/Items: ${itemCount}

`;

    // Health score details
    if (audit.healthScoreDetails) {
      const details = audit.healthScoreDetails as {
        subscores?: Array<{ name: string; score: number; weight: number; explanation?: string }>;
      };
      if (details.subscores && details.subscores.length > 0) {
        context += `=== SCORE BREAKDOWN ===\n`;
        for (const sub of details.subscores) {
          context += `- ${sub.name}: ${sub.score}/100 (Weight: ${Math.round(sub.weight * 100)}%). ${sub.explanation || ''}\n`;
        }
        context += `\n`;
      }
    }

    // Benchmark comparison details
    if (audit.benchmarkAnalysis) {
      const benchmark = audit.benchmarkAnalysis as {
        spendPerEmployee?: number;
        percentile?: number;
        optimizationRating?: string;
        industryAverage?: number;
      };
      context += `=== INDUSTRY BENCHMARKS ===
- Spend per Employee: $${benchmark.spendPerEmployee ?? 0}
- Percentile Standing: ${benchmark.percentile ?? 50}th percentile (lower indicates higher efficiency)
- Optimization Level: ${benchmark.optimizationRating ?? 'average'}
- Average Sector Cost: $${benchmark.industryAverage ?? 0}

`;
    }

    // Recommendations list
    if (audit.recommendations && audit.recommendations.length > 0) {
      context += `=== ACTIVE OPTIMIZATION RECOMMENDATIONS ===\n`;
      for (const rec of audit.recommendations) {
        if (rec.deletedAt) continue;
        context += `- [Rec ID: ${rec.id.slice(0, 8)}] Name: ${rec.ruleName}
  * Category: ${rec.category}
  * Priority: ${rec.priority}
  * Potential Savings: $${Number(rec.estimatedMonthlySavings)}/mo
  * Action: ${rec.recommendedAction}
  * Current State: ${rec.currentState}
  * Context: ${rec.reason}
  * Confidence: ${Math.round(Number(rec.confidenceScore) * 100)}%
`;
      }
      context += `\n`;
    }

    // Tools inventory
    if (audit.items && audit.items.length > 0) {
      context += `=== SOFTWARE TOOL INVENTORY ===\n`;
      for (const item of audit.items) {
        if (item.deletedAt) continue;
        context += `- Tool: ${item.toolName} | Plan: ${item.planName || 'Standard'} | Seats: ${item.seatCount} | Team Size: ${item.teamSize} | Monthly Cost: $${Number(item.spendAmount)}\n`;
      }
      context += `\n`;
    }

    return context;
  }
}
