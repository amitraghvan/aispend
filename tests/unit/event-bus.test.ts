/**
 * Event Bus Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '@/lib/events/event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should publish events to subscribers', async () => {
    const handler = vi.fn();
    eventBus.on('audit.created', handler);
    await eventBus.publish('audit.created', { auditId: '123' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'audit.created', payload: { auditId: '123' } })
    );
  });

  it('should support multiple handlers for same event', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.on('audit.completed', h1);
    eventBus.on('audit.completed', h2);
    await eventBus.publish('audit.completed', {});
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe handlers', async () => {
    const handler = vi.fn();
    eventBus.on('lead.captured', handler);
    eventBus.off('lead.captured', handler);
    await eventBus.publish('lead.captured', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not crash if handler throws', async () => {
    const badHandler = vi.fn().mockRejectedValue(new Error('fail'));
    const goodHandler = vi.fn();
    eventBus.on('email.sent', badHandler);
    eventBus.on('email.sent', goodHandler);
    await eventBus.publish('email.sent', {});
    expect(goodHandler).toHaveBeenCalled();
  });

  it('should include timestamp and correlationId', async () => {
    const handler = vi.fn();
    eventBus.on('report.generated', handler);
    await eventBus.publish('report.generated', { reportId: '456' }, 'corr-id-1');
    const event = handler.mock.calls[0][0];
    expect(event.timestamp).toBeDefined();
    expect(event.correlationId).toBe('corr-id-1');
  });

  it('should return handler count', () => {
    eventBus.on('audit.created', vi.fn());
    eventBus.on('audit.created', vi.fn());
    expect(eventBus.handlerCount('audit.created')).toBe(2);
    expect(eventBus.handlerCount('lead.captured')).toBe(0);
  });

  it('should clear all handlers', () => {
    eventBus.on('audit.created', vi.fn());
    eventBus.on('lead.captured', vi.fn());
    eventBus.clear();
    expect(eventBus.handlerCount('audit.created')).toBe(0);
    expect(eventBus.handlerCount('lead.captured')).toBe(0);
  });
});
