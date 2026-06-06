import { groqProvider } from './GroqProvider';
import { PROMPTS, HealthScoreExplanationSchema, HealthScoreExplanation } from '../prompts/templates';

export interface HealthSubscoreInput {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}

export class HealthScoreExplainerService {
  async generateExplanation(data: {
    overallScore: number;
    grade: string;
    subscores: HealthSubscoreInput[];
  }): Promise<HealthScoreExplanation> {
    const subscoresText = data.subscores
      .map(
        (s) =>
          `- ${s.name}: Score ${s.score}/100 (Weight: ${s.weight * 100}%). Info: ${s.explanation}`
      )
      .join('\n');

    const prompt = PROMPTS.HEALTH_SCORE.user({
      overallScore: data.overallScore,
      grade: data.grade,
      subscoresText,
    });
    const system = PROMPTS.HEALTH_SCORE.system;

    return groqProvider.generateStructuredJSON(
      system,
      prompt,
      HealthScoreExplanationSchema
    );
  }
}

export const healthScoreExplainerService = new HealthScoreExplainerService();
