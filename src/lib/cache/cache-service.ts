/**
 * Cache Service — Redis-backed caching with TTL strategy
 */

import { redis } from '@/lib/redis/redis';

const TTL = {
  AUDIT_RESULT: 3600,      // 1 hour
  PRICING_LOOKUP: 86400,   // 24 hours
  BENCHMARK: 86400,        // 24 hours
  REPORT_SUMMARY: 7200,    // 2 hours
  LEAD_SCORE: 1800,        // 30 minutes
} as const;

export class CacheService {
  private prefix: string;

  constructor(prefix: string = 'aispend') {
    this.prefix = prefix;
  }

  private key(namespace: string, id: string): string {
    return `${this.prefix}:${namespace}:${id}`;
  }

  async get<T>(namespace: string, id: string): Promise<T | null> {
    try {
      const data = await redis.get(this.key(namespace, id));
      if (!data) return null;
      return typeof data === 'string' ? JSON.parse(data) : data as T;
    } catch {
      return null;
    }
  }

  async set<T>(namespace: string, id: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.set(this.key(namespace, id), serialized, { ex: ttlSeconds });
      } else {
        await redis.set(this.key(namespace, id), serialized);
      }
    } catch {
      // Cache write failures are non-fatal
    }
  }

  async invalidate(namespace: string, id: string): Promise<void> {
    try {
      await redis.del(this.key(namespace, id));
    } catch {
      // Cache invalidation failures are non-fatal
    }
  }

  async invalidatePattern(namespace: string): Promise<void> {
    try {
      const pattern = `${this.prefix}:${namespace}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } catch {
      // Non-fatal
    }
  }

  // Convenience methods with built-in TTLs
  async getAudit<T>(auditId: string): Promise<T | null> {
    return this.get<T>('audit', auditId);
  }

  async setAudit<T>(auditId: string, data: T): Promise<void> {
    return this.set('audit', auditId, data, TTL.AUDIT_RESULT);
  }

  async getPricing<T>(key: string): Promise<T | null> {
    return this.get<T>('pricing', key);
  }

  async setPricing<T>(key: string, data: T): Promise<void> {
    return this.set('pricing', key, data, TTL.PRICING_LOOKUP);
  }

  async getBenchmark<T>(key: string): Promise<T | null> {
    return this.get<T>('benchmark', key);
  }

  async setBenchmark<T>(key: string, data: T): Promise<void> {
    return this.set('benchmark', key, data, TTL.BENCHMARK);
  }

  async getReport<T>(reportId: string): Promise<T | null> {
    return this.get<T>('report', reportId);
  }

  async setReport<T>(reportId: string, data: T): Promise<void> {
    return this.set('report', reportId, data, TTL.REPORT_SUMMARY);
  }
}

export const cacheService = new CacheService();
