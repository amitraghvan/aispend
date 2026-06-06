/**
 * Email Service Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '@/features/email/services/EmailService';
import { prismaMock } from '../setup';
import { eventBus } from '@/lib/events/event-bus';

// Mock fetch globally for email tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('EmailService', () => {
  const service = new EmailService();

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    mockFetch.mockReset();
  });

  it('should have audit_confirmation template', () => {
    const template = service.getTemplate('audit_confirmation');
    expect(template).toBeDefined();
    const result = template!({ currentSpend: 500, monthlySavings: 100, healthScore: 75, healthGrade: 'B', recommendationCount: 5, reportUrl: 'https://example.com' });
    expect(result.subject).toContain('Audit is Ready');
    expect(result.html).toContain('$500');
    expect(result.html).toContain('$100');
  });

  it('should have lead_confirmation template', () => {
    const template = service.getTemplate('lead_confirmation');
    expect(template).toBeDefined();
    const result = template!({ name: 'John' });
    expect(result.subject).toContain('Welcome');
    expect(result.html).toContain('John');
  });

  it('should have optimization_alert template', () => {
    const template = service.getTemplate('optimization_alert');
    expect(template).toBeDefined();
    const result = template!({ monthlySavings: 50, recommendation: 'Switch plans', dashboardUrl: 'https://example.com' });
    expect(result.subject).toContain('$50');
    expect(result.html).toContain('Switch plans');
  });

  it('should throw for unknown template', async () => {
    await expect(service.send({
      to: 'test@example.com',
      subject: 'Test',
      template: 'nonexistent',
      data: {},
    })).rejects.toThrow('Unknown email template');
  });

  it('should create email log and send successfully', async () => {
    prismaMock.emailLog.create.mockResolvedValue({ id: 'email-1' });
    prismaMock.emailLog.update.mockResolvedValue({ id: 'email-1', status: 'SENT' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-id-123' }),
    });

    const result = await service.send({
      to: 'test@example.com',
      subject: 'Test',
      template: 'lead_confirmation',
      data: { name: 'Test' },
    });

    expect(prismaMock.emailLog.create).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.emailLogId).toBe('email-1');
  });

  it('should retry on failure and eventually fail', async () => {
    prismaMock.emailLog.create.mockResolvedValue({ id: 'email-2' });
    prismaMock.emailLog.update.mockResolvedValue({ id: 'email-2', status: 'FAILED' });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server Error'),
    });

    const result = await service.send({
      to: 'test@example.com',
      subject: 'Test',
      template: 'lead_confirmation',
      data: { name: 'Test' },
    });

    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 3 retries
  });

  it('should emit email.sent event on success', async () => {
    const handler = vi.fn();
    eventBus.on('email.sent', handler);

    prismaMock.emailLog.create.mockResolvedValue({ id: 'email-3' });
    prismaMock.emailLog.update.mockResolvedValue({ id: 'email-3', status: 'SENT' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'resend-id-456' }),
    });

    await service.send({
      to: 'test@example.com',
      subject: 'Test',
      template: 'audit_confirmation',
      data: { currentSpend: 500, monthlySavings: 100, healthScore: 75, healthGrade: 'B', recommendationCount: 5, reportUrl: 'https://example.com' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit email.failed event on failure', async () => {
    const handler = vi.fn();
    eventBus.on('email.failed', handler);

    prismaMock.emailLog.create.mockResolvedValue({ id: 'email-4' });
    prismaMock.emailLog.update.mockResolvedValue({ id: 'email-4', status: 'FAILED' });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid API key'),
    });

    await service.send({
      to: 'test@example.com',
      subject: 'Test',
      template: 'lead_confirmation',
      data: { name: 'Test' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
