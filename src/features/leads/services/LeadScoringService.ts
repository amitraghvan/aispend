/**
 * Lead Scoring Service — Score leads as HOT, WARM, or COLD.
 *
 * Deterministic scoring based on:
 * - Monthly spend (higher = hotter)
 * - Company/team size (larger = hotter)
 * - Optimization opportunity (more savings = hotter)
 * - Role (decision-maker = hotter)
 */

export interface LeadScoreInput {
  monthlySpend?: number;
  annualSpend?: number;
  teamSize?: number;
  savingsPercentage?: number;
  monthlySavings?: number;
  role?: string;
  companyName?: string;
}

export interface LeadScoreResult {
  score: 'HOT' | 'WARM' | 'COLD';
  scoreValue: number; // 0-100
  factors: string[];
}

const DECISION_MAKER_ROLES = ['cto', 'ceo', 'vp engineering', 'vp of engineering', 'head of engineering', 'director', 'founder', 'co-founder', 'chief'];

export class LeadScoringService {
  score(input: LeadScoreInput): LeadScoreResult {
    let scoreValue = 0;
    const factors: string[] = [];

    // Monthly spend (0-30 points)
    const spend = input.monthlySpend ?? (input.annualSpend ? input.annualSpend / 12 : 0);
    if (spend >= 1000) {
      scoreValue += 30; factors.push('High monthly spend (>$1000)');
    } else if (spend >= 500) {
      scoreValue += 20; factors.push('Medium monthly spend ($500-$1000)');
    } else if (spend >= 100) {
      scoreValue += 10; factors.push('Low monthly spend ($100-$500)');
    } else if (spend > 0) {
      scoreValue += 5; factors.push('Minimal spend (<$100)');
    }

    // Team size (0-20 points)
    const teamSize = input.teamSize ?? 0;
    if (teamSize >= 50) {
      scoreValue += 20; factors.push('Large team (50+)');
    } else if (teamSize >= 20) {
      scoreValue += 15; factors.push('Medium team (20-50)');
    } else if (teamSize >= 5) {
      scoreValue += 10; factors.push('Small team (5-20)');
    } else if (teamSize > 0) {
      scoreValue += 5; factors.push('Very small team (<5)');
    }

    // Savings opportunity (0-25 points)
    const savingsPct = input.savingsPercentage ?? 0;
    if (savingsPct >= 30) {
      scoreValue += 25; factors.push('High optimization opportunity (>30%)');
    } else if (savingsPct >= 15) {
      scoreValue += 15; factors.push('Medium optimization opportunity (15-30%)');
    } else if (savingsPct >= 5) {
      scoreValue += 8; factors.push('Low optimization opportunity (5-15%)');
    }

    // Monthly savings absolute (0-15 points)
    const monthlySavings = input.monthlySavings ?? 0;
    if (monthlySavings >= 500) {
      scoreValue += 15; factors.push('High savings potential (>$500/mo)');
    } else if (monthlySavings >= 100) {
      scoreValue += 10; factors.push('Medium savings potential ($100-$500/mo)');
    } else if (monthlySavings > 0) {
      scoreValue += 5; factors.push('Low savings potential (<$100/mo)');
    }

    // Role (0-10 points)
    if (input.role) {
      const normalizedRole = input.role.toLowerCase().trim();
      if (DECISION_MAKER_ROLES.some((r) => normalizedRole.includes(r))) {
        scoreValue += 10; factors.push('Decision-maker role');
      } else {
        scoreValue += 3; factors.push('Non-decision-maker role');
      }
    }

    // Cap at 100
    scoreValue = Math.min(100, scoreValue);

    // Determine tier
    let score: 'HOT' | 'WARM' | 'COLD';
    if (scoreValue >= 60) {
      score = 'HOT';
    } else if (scoreValue >= 30) {
      score = 'WARM';
    } else {
      score = 'COLD';
    }

    return { score, scoreValue, factors };
  }
}

export const leadScoringService = new LeadScoringService();
