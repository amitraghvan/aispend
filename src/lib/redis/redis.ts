import { Redis } from '@upstash/redis';
import { env } from '@/validators/env';

/**
 * Redis client for Upstash.
 * Returns null if credentials are not configured (local dev without Redis).
 */
function createRedisClient(): Redis | null {
  if (!env.UPSTASH_REDIS_URL || !env.UPSTASH_REDIS_TOKEN) {
    return null;
  }
  return new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
  });
}

export const redis = createRedisClient();
export default redis;
