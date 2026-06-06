/**
 * POST /api/leads — Capture a new lead.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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

import { rateLimit } from '@/lib/redis/rate-limiter';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ──
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // Allow 5 lead submissions per minute (60 seconds) per IP
    const limitResult = await rateLimit(`lead_capture:${ip}`, 5, 60);
    
    if (!limitResult.success) {
      const errorRes = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: `Rate limit exceeded. Try again in ${limitResult.reset} seconds.`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
      errorRes.headers.set('X-RateLimit-Limit', String(limitResult.limit));
      errorRes.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
      errorRes.headers.set('X-RateLimit-Reset', String(limitResult.reset));
      return errorRes;
    }

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

    // Check duplicate in database
    const normalizedEmail = email.toLowerCase().trim();
    const existingLead = await prisma.lead.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });
    if (existingLead) {
      return apiValidationError('This email has already been captured.');
    }

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

    // Persist lead to PostgreSQL database
    const lead = await prisma.lead.create({
      data: {
        email: normalizedEmail,
        name: parsed.data.name || null,
        companyName: parsed.data.companyName || null,
        role: parsed.data.role || null,
        teamSize: parsed.data.teamSize || null,
        monthlySpend: parsed.data.monthlySpend ? new Prisma.Decimal(parsed.data.monthlySpend) : null,
        auditId: parsed.data.auditId || null,
        status: 'NEW',
        score: tier as 'HOT' | 'WARM' | 'COLD',
        scoreValue: score,
        utmSource: parsed.data.utmSource || null,
        utmCampaign: parsed.data.utmCampaign || null,
      },
    });

    log.info('api_lead_captured', `Lead captured: ${email}`, { leadId: lead.id, score: tier, scoreValue: score });

    const response = apiCreated({
      leadId: lead.id,
      status: 'created',
      score: tier,
      scoreValue: score,
    });
    response.headers.set('X-RateLimit-Limit', String(limitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(limitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(limitResult.reset));
    return response;
  } catch (error) {
    log.error('api_lead_error', 'Failed to capture lead', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return apiServerError('Failed to capture lead');
  }
}
