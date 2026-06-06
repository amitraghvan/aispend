import { groqProvider } from './GroqProvider';
import { PROMPTS, BenchmarkNarrativeSchema, BenchmarkNarrative } from '../prompts/templates';

export class BenchmarkNarrativeService {
  async generateNarrative(data: {
    spendPerEmployee: number;
    percentile: number;
    optimizationRating: string;
    industryAverage: number;
  }): Promise<BenchmarkNarrative> {
    const prompt = PROMPTS.BENCHMARK.user(data);
    const system = PROMPTS.BENCHMARK.system;

    return groqProvider.generateStructuredJSON(
      system,
      prompt,
      BenchmarkNarrativeSchema
    );
  }
}

export const benchmarkNarrativeService = new BenchmarkNarrativeService();
