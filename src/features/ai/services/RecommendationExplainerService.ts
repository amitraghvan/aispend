import { groqProvider } from './GroqProvider';
import { PROMPTS, RecommendationExplanationSchema, RecommendationExplanation } from '../prompts/templates';

export class RecommendationExplainerService {
  async generateExplanation(data: {
    ruleName: string;
    category: string;
    priority: string;
    reason: string;
    currentState: string;
    recommendedAction: string;
    estimatedMonthlySavings: number;
  }): Promise<RecommendationExplanation> {
    const prompt = PROMPTS.RECOMMENDATION.user(data);
    const system = PROMPTS.RECOMMENDATION.system;

    return groqProvider.generateStructuredJSON(
      system,
      prompt,
      RecommendationExplanationSchema
    );
  }
}

export const recommendationExplainerService = new RecommendationExplainerService();
