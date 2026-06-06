import { toolCatalogRepository, ToolCatalogRepository } from '../../catalog/repositories/ToolCatalogRepository';
import { PricingLookupResult, PricingComparison } from '../types';
import { ValidationError, NotFoundError } from '@/lib/errors/AppError';
import { ToolPlan } from '../../catalog/types';

export class PricingService {
  private catalogRepo: ToolCatalogRepository;

  constructor(catalogRepo: ToolCatalogRepository = toolCatalogRepository) {
    this.catalogRepo = catalogRepo;
  }

  /**
   * Calculate the effective monthly price per seat.
   * If an annual price is available, the effective monthly = annual / 12.
   * Otherwise falls back to the standard monthly price.
   */
  private computeEffectiveMonthlyPrice(plan: ToolPlan, useAnnualBilling: boolean): number {
    if (useAnnualBilling && plan.annualPricePerSeat !== null) {
      return Math.round((plan.annualPricePerSeat / 12) * 100) / 100;
    }
    return plan.monthlyPricePerSeat;
  }

  /**
   * Look up full pricing for a tool + plan + seat count combination.
   */
  lookupPricing(
    toolId: string,
    planId: string,
    seatCount: number,
    useAnnualBilling: boolean = false
  ): PricingLookupResult {
    if (seatCount < 1) {
      throw new ValidationError('Seat count must be at least 1.', { seatCount });
    }

    const plan = this.catalogRepo.getPlan(toolId, planId);

    // Validate seat constraints
    if (seatCount < plan.seatMinimum) {
      throw new ValidationError(
        `Plan "${plan.planName}" requires at least ${plan.seatMinimum} seats.`,
        { planId, seatMinimum: plan.seatMinimum, seatCount }
      );
    }
    if (plan.seatMaximum !== null && seatCount > plan.seatMaximum) {
      throw new ValidationError(
        `Plan "${plan.planName}" supports at most ${plan.seatMaximum} seats.`,
        { planId, seatMaximum: plan.seatMaximum, seatCount }
      );
    }

    const effectiveMonthly = this.computeEffectiveMonthlyPrice(plan, useAnnualBilling);
    const totalMonthly = Math.round(effectiveMonthly * seatCount * 100) / 100;
    const totalAnnual = Math.round(totalMonthly * 12 * 100) / 100;

    return {
      toolId,
      planId,
      planName: plan.planName,
      monthlyPricePerSeat: plan.monthlyPricePerSeat,
      annualPricePerSeat: plan.annualPricePerSeat,
      effectiveMonthlyPrice: effectiveMonthly,
      totalMonthlyCost: totalMonthly,
      totalAnnualCost: totalAnnual,
      seatCount,
    };
  }

  /**
   * Look up pricing by tool ID and plan name (case-insensitive).
   */
  lookupByPlanName(
    toolId: string,
    planName: string,
    seatCount: number,
    useAnnualBilling: boolean = false
  ): PricingLookupResult {
    const plan = this.catalogRepo.findPlanByName(toolId, planName);
    if (!plan) {
      throw new NotFoundError(`Plan "${planName}" not found for tool "${toolId}".`);
    }
    return this.lookupPricing(toolId, plan.planId, seatCount, useAnnualBilling);
  }

  /**
   * Compare pricing between current plan and an alternative plan.
   */
  comparePlans(
    currentToolId: string,
    currentPlanId: string,
    altToolId: string,
    altPlanId: string,
    seatCount: number,
    useAnnualBilling: boolean = false
  ): PricingComparison {
    const currentPricing = this.lookupPricing(currentToolId, currentPlanId, seatCount, useAnnualBilling);
    const altPricing = this.lookupPricing(altToolId, altPlanId, seatCount, useAnnualBilling);

    const monthlySavings = Math.round((currentPricing.totalMonthlyCost - altPricing.totalMonthlyCost) * 100) / 100;
    const annualSavings = Math.round(monthlySavings * 12 * 100) / 100;
    const savingsPercentage =
      currentPricing.totalMonthlyCost > 0
        ? Math.round((monthlySavings / currentPricing.totalMonthlyCost) * 10000) / 100
        : 0;

    return {
      currentPricing,
      alternativePricing: altPricing,
      monthlySavings,
      annualSavings,
      savingsPercentage,
    };
  }

  /**
   * Find the cheapest plan for a tool that satisfies seat constraints.
   */
  findCheapestPlan(toolId: string, seatCount: number): PricingLookupResult | null {
    const tool = this.catalogRepo.getById(toolId);
    const eligiblePlans = tool.plans.filter(
      (p) => p.monthlyPricePerSeat > 0 && seatCount >= p.seatMinimum && (p.seatMaximum === null || seatCount <= p.seatMaximum)
    );

    if (eligiblePlans.length === 0) return null;

    const cheapest = eligiblePlans.reduce((min, plan) =>
      plan.monthlyPricePerSeat < min.monthlyPricePerSeat ? plan : min
    );

    return this.lookupPricing(toolId, cheapest.planId, seatCount);
  }
}

export const pricingService = new PricingService();
