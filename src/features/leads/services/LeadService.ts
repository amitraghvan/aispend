/**
 * Lead Service — Lead capture with spam protection, duplicate prevention, and scoring.
 */

import { leadRepository } from '../repositories/LeadRepository';
import { leadScoringService, LeadScoreInput } from './LeadScoringService';
import { eventBus } from '@/lib/events/event-bus';
import { logger } from '@/lib/logger/logger';
import { z } from 'zod';

const log = logger.forService('lead-service');

export const leadCaptureSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().min(1).max(200).optional(),
  role: z.string().max(200).optional(),
  teamSize: z.number().int().min(1).max(100000).optional(),
  spendRange: z.string().max(100).optional(),
  auditId: z.string().optional(),
  monthlySpend: z.number().min(0).optional(),
  annualSpend: z.number().min(0).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
});

export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;

// Simple spam checks
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email', '10minutemail.com', 'yopmail.com'];

export class LeadService {
  async captureLead(input: LeadCaptureInput, meta?: { ipAddress?: string; userAgent?: string }) {
    // 1. Validate
    const validated = leadCaptureSchema.parse(input);

    // 2. Spam check
    const emailDomain = validated.email.split('@')[1]?.toLowerCase();
    if (emailDomain && DISPOSABLE_DOMAINS.includes(emailDomain)) {
      throw new Error('Disposable email addresses are not allowed.');
    }

    // 3. Duplicate check (within 24 hours)
    const isDuplicate = await leadRepository.isDuplicate(validated.email);
    if (isDuplicate) {
      log.warn('lead_duplicate', `Duplicate lead attempt: ${validated.email}`);
      // Return silently — don't expose duplicate info to potential attackers
      const existing = await leadRepository.findByEmail(validated.email);
      return { leadId: existing?.id ?? '', status: 'exists' };
    }

    // 4. Score lead
    const scoreInput: LeadScoreInput = {
      monthlySpend: validated.monthlySpend,
      annualSpend: validated.annualSpend,
      teamSize: validated.teamSize,
      role: validated.role,
      companyName: validated.companyName,
    };
    const scoreResult = leadScoringService.score(scoreInput);

    // 5. Create lead
    const lead = await leadRepository.create({
      email: validated.email,
      name: validated.name,
      companyName: validated.companyName,
      role: validated.role,
      teamSize: validated.teamSize,
      spendRange: validated.spendRange,
      auditId: validated.auditId,
      monthlySpend: validated.monthlySpend ? validated.monthlySpend : undefined,
      annualSpend: validated.annualSpend ? validated.annualSpend : undefined,
      score: scoreResult.score,
      scoreValue: scoreResult.scoreValue,
      utmSource: validated.utmSource,
      utmMedium: validated.utmMedium,
      utmCampaign: validated.utmCampaign,
      utmContent: validated.utmContent,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    // 6. Emit event
    await eventBus.publish('lead.captured', {
      leadId: lead.id, email: validated.email, score: scoreResult.score,
      scoreValue: scoreResult.scoreValue, factors: scoreResult.factors,
    });

    log.info('lead_captured', `Lead captured: ${validated.email}`, {
      leadId: lead.id, score: scoreResult.score, scoreValue: scoreResult.scoreValue,
    });

    return { leadId: lead.id, status: 'created', score: scoreResult.score, scoreValue: scoreResult.scoreValue };
  }
}

export const leadService = new LeadService();
