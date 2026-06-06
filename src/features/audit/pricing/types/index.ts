export interface PricingLookupResult {
  toolId: string;
  planId: string;
  planName: string;
  monthlyPricePerSeat: number;
  annualPricePerSeat: number | null;
  effectiveMonthlyPrice: number; // Actual cost per seat factoring annual discount
  totalMonthlyCost: number;
  totalAnnualCost: number;
  seatCount: number;
}

export interface PricingComparison {
  currentPricing: PricingLookupResult;
  alternativePricing: PricingLookupResult;
  monthlySavings: number;
  annualSavings: number;
  savingsPercentage: number;
}
