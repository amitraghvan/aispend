/**
 * Event System — Domain Event Bus
 *
 * Publish-subscribe event bus for decoupled cross-cutting concerns.
 * Future-ready: can be replaced with a message queue (Redis Streams, SQS, etc.)
 */

import { trackServerEvent } from '@/lib/observability/posthog';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type EventName =
  | 'audit.created'
  | 'audit.processing'
  | 'audit.completed'
  | 'audit.failed'
  | 'report.generated'
  | 'lead.captured'
  | 'lead.scored'
  | 'email.sent'
  | 'email.failed'
  | 'share.created'
  | 'share.viewed';

export interface DomainEvent<T = unknown> {
  name: EventName;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

class EventBus {
  private handlers = new Map<EventName, EventHandler[]>();

  /**
   * Subscribe to an event.
   */
  on<T = unknown>(eventName: EventName, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventName, existing);
  }

  /**
   * Unsubscribe from an event.
   */
  off(eventName: EventName, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(
      eventName,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Publish an event. Handlers execute asynchronously (fire-and-forget).
   */
  async publish<T = unknown>(eventName: EventName, payload: T, correlationId?: string): Promise<void> {
    const event: DomainEvent<T> = {
      name: eventName,
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    const handlers = this.handlers.get(eventName) ?? [];
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event as DomainEvent);
      } catch {
        // In production, log the error. Handlers should not crash the publisher.
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Clear all handlers (useful for testing).
   */
  clear(): void {
    this.handlers.clear();
    // Re-register defaults after clearing in tests if needed, but in tests eventBus.clear() is common
  }

  /**
   * Get handler count for an event (useful for testing).
   */
  handlerCount(eventName: EventName): number {
    return (this.handlers.get(eventName) ?? []).length;
  }
}

export const eventBus = new EventBus();

// ── Observability & DB Logging Subscribers ──

async function persistEvent(name: string, organizationId?: string | null, payload?: unknown) {
  try {
    // Prevent event loop recursion if event triggers event creation failures
    await prisma.event.create({
      data: {
        name,
        organizationId: organizationId || null,
        payload: (payload as Prisma.InputJsonValue) || {},
      },
    });
  } catch (error) {
    console.error('Failed to persist event to database:', error);
  }
}

// 1. Audit Completed
eventBus.on('audit.completed', async (event) => {
  const payload = event.payload as { organizationId?: string; [key: string]: unknown };
  trackServerEvent(payload.organizationId || 'anonymous', 'audit_generated', payload);
  await persistEvent(event.name, payload.organizationId, payload);
});

// 2. Audit Failed
eventBus.on('audit.failed', async (event) => {
  const payload = event.payload as { organizationId?: string; error?: string; [key: string]: unknown };
  Sentry.captureException(new Error(`Audit failed: ${payload.error}`), {
    extra: payload,
  });
  trackServerEvent(payload.organizationId || 'anonymous', 'audit_failed', payload);
  await persistEvent(event.name, payload.organizationId, payload);
});

// 3. Report Generated
eventBus.on('report.generated', async (event) => {
  const payload = event.payload as { organizationId?: string; [key: string]: unknown };
  trackServerEvent(payload.organizationId || 'anonymous', 'report_generated', payload);
  await persistEvent(event.name, payload.organizationId, payload);
});

// 4. Email Failed
eventBus.on('email.failed', async (event) => {
  const payload = event.payload as { error?: string; [key: string]: unknown };
  Sentry.captureException(new Error(`Email delivery failed: ${payload.error}`), {
    extra: payload,
  });
});

// 5. Share Created
eventBus.on('share.created', async (event) => {
  const payload = event.payload as { organizationId?: string; [key: string]: unknown };
  await persistEvent(event.name, payload.organizationId, payload);
});

// 6. Share Viewed
eventBus.on('share.viewed', async (event) => {
  const payload = event.payload as { organizationId?: string; [key: string]: unknown };
  trackServerEvent('anonymous', 'share_viewed', payload);
  await persistEvent(event.name, payload.organizationId, payload);
});
