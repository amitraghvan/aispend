import { groqProvider } from './GroqProvider';
import { PROMPTS, OpportunityInsightListSchema, OpportunityInsightList } from '../prompts/templates';

export interface OpportunityRecommendationInput {
  ruleName: string;
  category: string;
  priority: string;
  reason: string;
  currentState: string;
  recommendedAction: string;
  estimatedMonthlySavings: number;
}

export class OpportunityInsightService {
  async generateOpportunities(
    recommendations: OpportunityRecommendationInput[]
  ): Promise<OpportunityInsightList> {
    const recsText = recommendations
      .slice(0, 10) // Limit to top 10 recommendations to avoid prompt bloat
      .map(
        (r, index) =>
          `[${index + 1}] Rule: ${r.ruleName} | Category: ${r.category} | Priority: ${r.priority} | Monthly Savings: $${r.estimatedMonthlySavings} | Reason: ${r.reason} | Recommended Action: ${r.recommendedAction}`
      )
      .join('\n');

    const prompt = PROMPTS.OPPORTUNITIES.user({ recsText });
    const system = PROMPTS.OPPORTUNITIES.system;

    return groqProvider.generateStructuredJSON(
      system,
      prompt,
      OpportunityInsightListSchema
    );
  }
}

export const opportunityInsightService = new OpportunityInsightService();
