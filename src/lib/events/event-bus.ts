/**
 * Event System — Domain Event Bus
 *
 * Publish-subscribe event bus for decoupled cross-cutting concerns.
 * Future-ready: can be replaced with a message queue (Redis Streams, SQS, etc.)
 */

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
  }

  /**
   * Get handler count for an event (useful for testing).
   */
  handlerCount(eventName: EventName): number {
    return (this.handlers.get(eventName) ?? []).length;
  }
}

export const eventBus = new EventBus();
