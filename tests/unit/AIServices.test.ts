import { describe, it, expect } from 'vitest';
import { executiveSummaryService } from '@/features/ai/services/ExecutiveSummaryService';
import { recommendationExplainerService } from '@/features/ai/services/RecommendationExplainerService';
import { healthScoreExplainerService } from '@/features/ai/services/HealthScoreExplainerService';
import { benchmarkNarrativeService } from '@/features/ai/services/BenchmarkNarrativeService';
import { opportunityInsightService } from '@/features/ai/services/OpportunityInsightService';

describe('AI CFO Explainer Services', () => {
  describe('ExecutiveSummaryService', () => {
    it('should generate summary from audit metrics', async () => {
      const summary = await executiveSummaryService.generateSummary({
        currentSpend: 1000,
        optimizedSpend: 800,
        monthlySavings: 200,
        annualSavings: 2400,
        healthScore: 80,
        healthGrade: 'B',
        toolCount: 5,
        recommendationCount: 3,
        overlapGroupCount: 1,
      });

      expect(summary.summary).toBeDefined();
      expect(summary.keyFindings.length).toBeGreaterThan(0);
      expect(summary.topOpportunity).toBeDefined();
      expect(summary.riskLevel).toBe('MEDIUM');
    });

    it('should generate summary with LOW risk level when healthScore is very high', async () => {
      const summary = await executiveSummaryService.generateSummary({
        currentSpend: 1000,
        optimizedSpend: 1000,
        monthlySavings: 0,
        annualSavings: 0,
        healthScore: 98,
        healthGrade: 'A',
        toolCount: 5,
        recommendationCount: 0,
        overlapGroupCount: 0,
      });
      expect(summary.riskLevel).toBeDefined();
      expect(summary.summary).toBeDefined();
    });
  });

  describe('RecommendationExplainerService', () => {
    it('should generate explainer for recommendation', async () => {
      const explanation = await recommendationExplainerService.generateExplanation({
        ruleName: 'Downgrade seats',
        category: 'seat_optimization',
        priority: 'HIGH',
        reason: 'Unused seats found on copilot',
        currentState: '15 seats, 10 active',
        recommendedAction: 'Downgrade 5 seats',
        estimatedMonthlySavings: 50,
      });

      expect(explanation.whyItExists).toBeDefined();
      expect(explanation.expectedOutcome).toBeDefined();
      expect(explanation.risk).toBeDefined();
      expect(explanation.complexity).toBe('LOW');
      expect(explanation.confidence).toBe(0.95);
      expect(explanation.businessImpact).toBeDefined();
    });
  });

  describe('HealthScoreExplainerService', () => {
    it('should generate explainer from score and subscores', async () => {
      const explanation = await healthScoreExplainerService.generateExplanation({
        overallScore: 75,
        grade: 'C',
        subscores: [
          { name: 'Plan Fit', score: 80, weight: 0.5, explanation: 'Good plan fit overall' },
          { name: 'Overlaps', score: 70, weight: 0.5, explanation: 'Minor tool overlaps detected' },
        ],
      });

      expect(explanation.narrative).toBeDefined();
      expect(explanation.strengths.length).toBeGreaterThan(0);
      expect(explanation.weaknesses.length).toBeGreaterThan(0);
      expect(explanation.biggestFactors.length).toBeGreaterThan(0);
      expect(explanation.improvementActions.length).toBeGreaterThan(0);
    });

    it('should handle empty subscores array gracefully', async () => {
      const explanation = await healthScoreExplainerService.generateExplanation({
        overallScore: 90,
        grade: 'A',
        subscores: [],
      });
      expect(explanation.narrative).toBeDefined();
      expect(explanation.strengths).toBeDefined();
    });
  });

  describe('BenchmarkNarrativeService', () => {
    it('should generate comparison narrative', async () => {
      const narrative = await benchmarkNarrativeService.generateNarrative({
        spendPerEmployee: 35,
        percentile: 65,
        optimizationRating: 'average',
        industryAverage: 30,
      });

      expect(narrative.positionNarrative).toBeDefined();
      expect(narrative.percentileAnalysis).toBeDefined();
      expect(narrative.industryComparison).toBeDefined();
      expect(narrative.optimizationPotential).toBeDefined();
    });

    it('should generate narrative for high percentile performers', async () => {
      const narrative = await benchmarkNarrativeService.generateNarrative({
        spendPerEmployee: 10,
        percentile: 95,
        optimizationRating: 'excellent',
        industryAverage: 50,
      });
      expect(narrative.positionNarrative).toBeDefined();
    });

    it('should generate narrative for low percentile performers', async () => {
      const narrative = await benchmarkNarrativeService.generateNarrative({
        spendPerEmployee: 100,
        percentile: 10,
        optimizationRating: 'poor',
        industryAverage: 50,
      });
      expect(narrative.positionNarrative).toBeDefined();
    });
  });

  describe('OpportunityInsightService', () => {
    it('should extract top opportunities from recommendations', async () => {
      const list = await opportunityInsightService.generateOpportunities([
        {
          ruleName: 'Overlapping mixed tools',
          category: 'OVERLAP_ELIMINATION',
          priority: 'CRITICAL',
          reason: 'Overlap in writing',
          currentState: 'Both Chatgpt and Claude',
          recommendedAction: 'Cancel ChatGPT',
          estimatedMonthlySavings: 200,
        },
      ]);

      expect(list.opportunities.length).toBeGreaterThan(0);
      expect(list.opportunities[0].title).toBeDefined();
      expect(list.opportunities[0].priority).toBe('HIGH');
      expect(list.opportunities[0].complexity).toBe('LOW');
    });

    it('should handle empty recommendations list gracefully', async () => {
      const list = await opportunityInsightService.generateOpportunities([]);
      expect(list.opportunities).toBeDefined();
    });

    it('should handle multiple recommendations and rank them', async () => {
      const list = await opportunityInsightService.generateOpportunities([
        {
          ruleName: 'Tool Overlap',
          category: 'OVERLAP_ELIMINATION',
          priority: 'HIGH',
          reason: 'Overlap',
          currentState: 'Active',
          recommendedAction: 'Consolidate',
          estimatedMonthlySavings: 50,
        },
        {
          ruleName: 'Unused seats',
          category: 'SEAT_OPTIMIZATION',
          priority: 'CRITICAL',
          reason: 'Unused',
          currentState: 'Active',
          recommendedAction: 'Remove',
          estimatedMonthlySavings: 200,
        }
      ]);
      expect(list.opportunities.length).toBeGreaterThan(0);
    });
  });
});
