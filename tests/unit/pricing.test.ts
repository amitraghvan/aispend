/**
 * Pricing Service Tests
 */
import { describe, it, expect } from 'vitest';
import { PricingService } from '@/features/audit/pricing/services/PricingService';

describe('PricingService', () => {
  const service = new PricingService();

  it('should lookup pricing for Cursor Pro', () => {
    const result = service.lookupPricing('cursor', 'cursor-pro', 1);
    expect(result.monthlyPricePerSeat).toBe(20);
    expect(result.totalMonthlyCost).toBe(20);
    expect(result.totalAnnualCost).toBe(240);
    expect(result.seatCount).toBe(1);
  });

  it('should apply annual billing discount', () => {
    const monthly = service.lookupPricing('cursor', 'cursor-pro', 1, false);
    const annual = service.lookupPricing('cursor', 'cursor-pro', 1, true);
    expect(annual.effectiveMonthlyPrice).toBe(16);
    expect(annual.effectiveMonthlyPrice).toBeLessThan(monthly.effectiveMonthlyPrice);
  });

  it('should throw for invalid seat count', () => {
    expect(() => service.lookupPricing('cursor', 'cursor-pro', 0)).toThrow();
  });

  it('should throw for seat minimum violation', () => {
    expect(() => service.lookupPricing('chatgpt', 'chatgpt-team', 1)).toThrow('at least 2');
  });

  it('should throw for seat maximum violation', () => {
    expect(() => service.lookupPricing('cursor', 'cursor-pro', 5)).toThrow('at most 1');
  });

  it('should lookup by plan name (case-insensitive)', () => {
    const result = service.lookupByPlanName('cursor', 'pro', 1);
    expect(result.planName).toBe('Pro');
    expect(result.monthlyPricePerSeat).toBe(20);
  });

  it('should throw for unknown plan name', () => {
    expect(() => service.lookupByPlanName('cursor', 'nonexistent', 1)).toThrow();
  });

  it('should compare plans correctly', () => {
    const comparison = service.comparePlans(
      'cursor', 'cursor-business', 'cursor', 'cursor-pro', 1
    );
    expect(comparison.monthlySavings).toBe(20);
    expect(comparison.annualSavings).toBe(240);
    expect(comparison.savingsPercentage).toBe(50);
  });

  it('should find cheapest plan for a tool', () => {
    const cheapest = service.findCheapestPlan('chatgpt', 5);
    expect(cheapest).not.toBeNull();
    expect(cheapest!.planName).toBe('Team');
  });

  it('should return null when no paid plans match seat count', () => {
    // Free plans have monthlyPricePerSeat = 0, so getCheapestPaidPlan would return the cheapest paid
    const result = service.findCheapestPlan('openai-api', 1);
    expect(result).toBeNull(); // API is pay-as-you-go with $0 base
  });
});
