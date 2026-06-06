/**
 * POST /api/leads — Capture a new lead.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiCreated, apiValidationError, apiServerError } from '@/lib/api/contracts';
import { logger } from '@/lib/logger/logger';
import { randomUUID } from 'crypto';

const log = logger.forService('leads-api');

// In-memory deduplication (replaced by database in production)
const capturedEmails = new Set<string>();

const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'yopmail.com', 'sharklasers.com'];

const leadSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().optional(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  teamSize: z.number().int().optional(),
  monthlySpend: z.number().optional(),
  auditId: z.string().optional(),
  utmSource: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError('Invalid lead data', parsed.error.flatten());
    }

    const { email } = parsed.data;

    // Check disposable email
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
      return apiValidationError('Disposable email addresses are not accepted');
    }

    // Check duplicate
    const normalizedEmail = email.toLowerCase().trim();
    if (capturedEmails.has(normalizedEmail)) {
      return apiValidationError('This email has already been captured.');
    }
    capturedEmails.add(normalizedEmail);

    // Score the lead
    let score = 0;
    if (parsed.data.monthlySpend && parsed.data.monthlySpend > 2000) score += 40;
    else if (parsed.data.monthlySpend && parsed.data.monthlySpend > 1000) score += 30;
    else if (parsed.data.monthlySpend && parsed.data.monthlySpend > 500) score += 20;
    else if (parsed.data.monthlySpend && parsed.data.monthlySpend > 100) score += 10;

    if (parsed.data.teamSize && parsed.data.teamSize >= 50) score += 25;
    else if (parsed.data.teamSize && parsed.data.teamSize >= 20) score += 15;
    else if (parsed.data.teamSize && parsed.data.teamSize >= 5) score += 10;

    if (parsed.data.auditId) score += 10;

    const tier = score >= 50 ? 'HOT' : score >= 25 ? 'WARM' : 'COLD';

    const leadId = randomUUID();
    log.info('api_lead_captured', `Lead captured: ${email}`, { leadId, score: tier, scoreValue: score });

    return apiCreated({
      leadId,
      status: 'created',
      score: tier,
      scoreValue: score,
    });
  } catch (error) {
    log.error('api_lead_error', 'Failed to capture lead', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to capture lead');
  }
}
