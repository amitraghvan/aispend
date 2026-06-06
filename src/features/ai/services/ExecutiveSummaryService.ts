import { groqProvider } from './GroqProvider';
import { PROMPTS, ExecutiveSummarySchema, ExecutiveSummary } from '../prompts/templates';

export class ExecutiveSummaryService {
  async generateSummary(data: {
    currentSpend: number;
    optimizedSpend: number;
    monthlySavings: number;
    annualSavings: number;
    healthScore: number;
    healthGrade: string;
    toolCount: number;
    recommendationCount: number;
    overlapGroupCount: number;
  }): Promise<ExecutiveSummary> {
    const prompt = PROMPTS.EXECUTIVE_SUMMARY.user(data);
    const system = PROMPTS.EXECUTIVE_SUMMARY.system;
    
    return groqProvider.generateStructuredJSON(
      system,
      prompt,
      ExecutiveSummarySchema
    );
  }
}

export const executiveSummaryService = new ExecutiveSummaryService();
