/**
 * Lead Service Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadService, leadCaptureSchema } from '@/features/leads/services/LeadService';
import { prismaMock } from '../setup';
import { eventBus } from '@/lib/events/event-bus';

describe('LeadService', () => {
  const service = new LeadService();

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
  });

  it('should validate lead input with Zod', () => {
    const valid = leadCaptureSchema.safeParse({
      email: 'test@company.com',
      name: 'Test User',
      companyName: 'TestCo',
      teamSize: 10,
    });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalid = leadCaptureSchema.safeParse({ email: 'not-an-email' });
    expect(invalid.success).toBe(false);
  });

  it('should reject missing email', () => {
    const invalid = leadCaptureSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it('should capture lead successfully', async () => {
    prismaMock.lead.count.mockResolvedValue(0); // Not duplicate
    prismaMock.lead.create.mockResolvedValue({
      id: 'lead-1',
      email: 'test@company.com',
      name: 'Test',
      score: 'WARM',
      scoreValue: 35,
    });

    const result = await service.captureLead({
      email: 'test@company.com',
      name: 'Test',
      companyName: 'TestCo',
      teamSize: 10,
      monthlySpend: 500,
    });

    expect(result.leadId).toBe('lead-1');
    expect(result.status).toBe('created');
  });

  it('should handle duplicate leads silently', async () => {
    prismaMock.lead.count.mockResolvedValue(1); // Is duplicate
    prismaMock.lead.findFirst.mockResolvedValue({ id: 'lead-existing' });

    const result = await service.captureLead({
      email: 'test@company.com',
    });

    expect(result.status).toBe('exists');
    expect(prismaMock.lead.create).not.toHaveBeenCalled();
  });

  it('should reject disposable email domains', async () => {
    await expect(
      service.captureLead({ email: 'test@mailinator.com' })
    ).rejects.toThrow('Disposable email');
  });

  it('should reject guerrillamail domain', async () => {
    await expect(
      service.captureLead({ email: 'test@guerrillamail.com' })
    ).rejects.toThrow('Disposable email');
  });

  it('should emit lead.captured event on success', async () => {
    const handler = vi.fn();
    eventBus.on('lead.captured', handler);

    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.lead.create.mockResolvedValue({
      id: 'lead-2', email: 'new@company.com', score: 'COLD', scoreValue: 10,
    });

    await service.captureLead({ email: 'new@company.com' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should include IP and user agent in lead', async () => {
    prismaMock.lead.count.mockResolvedValue(0);
    prismaMock.lead.create.mockResolvedValue({ id: 'lead-3' });

    await service.captureLead(
      { email: 'test@company.com' },
      { ipAddress: '1.2.3.4', userAgent: 'Mozilla' }
    );

    expect(prismaMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla',
        }),
      })
    );
  });
});
