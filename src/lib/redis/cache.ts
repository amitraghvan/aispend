import { redis } from './redis';
import { logger } from '../logger/logger';

// TTL Strategy (in seconds)
export const CACHE_TTLS = {
  API: 900,        // 15 minutes - Fast changing API responses
  AUDIT: 3600,     // 1 hour - Stable during active auditing session
  PRICING: 86400,  // 24 hours - Catalog prices change rarely
  SESSION: 7200,   // 2 hours - User session TTL
};

export type CacheNamespace = keyof typeof CACHE_TTLS;

class CacheService {
  private getPrefixKey(namespace: CacheNamespace, key: string): string {
    return `aispend:${namespace.toLowerCase()}:${key}`;
  }

  /**
   * Set value in cache with optional TTL
   */
  public async set<T>(
    namespace: CacheNamespace,
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<boolean> {
    const prefixedKey = this.getPrefixKey(namespace, key);
    const ttl = ttlSeconds ?? CACHE_TTLS[namespace];
    
    try {
      const stringifiedValue = JSON.stringify(value);
      await redis.set(prefixedKey, stringifiedValue, { ex: ttl });
      logger.debug('cache_set', `Cached key: ${prefixedKey}`, { namespace, key, ttl });
      return true;
    } catch (error) {
      logger.error('cache_set_error', `Failed to cache key: ${prefixedKey}`, {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get value from cache
   */
  public async get<T>(namespace: CacheNamespace, key: string): Promise<T | null> {
    const prefixedKey = this.getPrefixKey(namespace, key);
    
    try {
      const data = await redis.get<string>(prefixedKey);
      if (!data) {
        logger.debug('cache_miss', `Cache miss for key: ${prefixedKey}`, { namespace, key });
        return null;
      }
      
      logger.debug('cache_hit', `Cache hit for key: ${prefixedKey}`, { namespace, key });
      
      // Upstash client parses JSON automatically if it was set as object,
      // but just in case, handle both parsed object and raw string.
      if (typeof data === 'object') {
        return data as T;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('cache_get_error', `Failed to retrieve cached key: ${prefixedKey}`, {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Delete value from cache (Invalidation)
   */
  public async invalidate(namespace: CacheNamespace, key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixKey(namespace, key);
    try {
      await redis.del(prefixedKey);
      logger.info('cache_invalidate', `Invalidated cached key: ${prefixedKey}`, { namespace, key });
      return true;
    } catch (error) {
      logger.error('cache_invalidate_error', `Failed to invalidate cached key: ${prefixedKey}`, {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Invalidate all keys matching a namespace pattern (Bulk Invalidation)
   */
  public async invalidatePattern(namespace: CacheNamespace, pattern: string): Promise<boolean> {
    const prefix = this.getPrefixKey(namespace, pattern);
    try {
      // Upstash Redis supports scan and keys
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info('cache_bulk_invalidate', `Bulk invalidated keys matching: ${prefix}*`, {
          namespace,
          pattern,
          keysInvalidated: keys.length,
        });
      }
      return true;
    } catch (error) {
      logger.error('cache_bulk_invalidate_error', `Failed to bulk invalidate keys matching: ${prefix}*`, {
        namespace,
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const cache = new CacheService();
export default cache;
