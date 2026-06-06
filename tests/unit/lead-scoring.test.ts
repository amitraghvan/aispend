/**
 * Lead Scoring Service Tests
 */
import { describe, it, expect } from 'vitest';
import { LeadScoringService } from '@/features/leads/services/LeadScoringService';

describe('LeadScoringService', () => {
  const service = new LeadScoringService();

  it('should score HOT for high-spend CTO', () => {
    const result = service.score({
      monthlySpend: 2000,
      teamSize: 50,
      savingsPercentage: 35,
      monthlySavings: 700,
      role: 'CTO',
    });
    expect(result.score).toBe('HOT');
    expect(result.scoreValue).toBeGreaterThanOrEqual(60);
    expect(result.factors.length).toBeGreaterThanOrEqual(3);
  });

  it('should score COLD for minimal input', () => {
    const result = service.score({});
    expect(result.score).toBe('COLD');
    expect(result.scoreValue).toBeLessThan(30);
  });

  it('should score WARM for medium-spend developer', () => {
    const result = service.score({
      monthlySpend: 500,
      teamSize: 10,
      savingsPercentage: 20,
      role: 'Developer',
    });
    expect(result.score).toBe('WARM');
    expect(result.scoreValue).toBeGreaterThanOrEqual(30);
    expect(result.scoreValue).toBeLessThan(60);
  });

  it('should boost score for decision-maker roles', () => {
    const devResult = service.score({ monthlySpend: 500, role: 'Developer' });
    const ctoResult = service.score({ monthlySpend: 500, role: 'CTO' });
    expect(ctoResult.scoreValue).toBeGreaterThan(devResult.scoreValue);
  });

  it('should handle annual spend conversion', () => {
    const monthlyResult = service.score({ monthlySpend: 1000 });
    const annualResult = service.score({ annualSpend: 12000 });
    expect(monthlyResult.scoreValue).toBe(annualResult.scoreValue);
  });

  it('should cap score at 100', () => {
    const result = service.score({
      monthlySpend: 5000,
      teamSize: 100,
      savingsPercentage: 50,
      monthlySavings: 2500,
      role: 'CEO',
    });
    expect(result.scoreValue).toBeLessThanOrEqual(100);
  });

  it('should include specific factors in result', () => {
    const result = service.score({
      monthlySpend: 1500,
      teamSize: 30,
      role: 'VP Engineering',
    });
    expect(result.factors).toContain('High monthly spend (>$1000)');
    expect(result.factors).toContain('Medium team (20-50)');
    expect(result.factors).toContain('Decision-maker role');
  });

  it('should classify founder as decision-maker', () => {
    const result = service.score({ role: 'Co-Founder' });
    expect(result.factors).toContain('Decision-maker role');
  });

  it('should handle zero spend correctly', () => {
    const result = service.score({ monthlySpend: 0 });
    expect(result.scoreValue).toBe(0);
    expect(result.score).toBe('COLD');
  });

  it('should score savings percentage correctly', () => {
    const lowResult = service.score({ savingsPercentage: 8 });
    const highResult = service.score({ savingsPercentage: 40 });
    expect(highResult.scoreValue).toBeGreaterThan(lowResult.scoreValue);
  });
});
