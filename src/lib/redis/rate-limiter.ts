import { redis } from './redis';
import { logger } from '../logger/logger';
import { RateLimitError } from '../errors/AppError';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Sliding Window Rate Limiter using Upstash Redis pipelining
 * 
 * @param identifier Unique string identifying the client (IP, UserId, API Token, etc.)
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Duration of the rate limit window in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `aispend:rate_limit:${identifier}`;
  const clearBefore = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    
    // 1. Remove timestamps outside the sliding window
    pipeline.zremrangebyscore(key, 0, clearBefore);
    // 2. Count requests in current sliding window
    pipeline.zcard(key);
    // 3. Add the current timestamp (using now as both score and member)
    pipeline.zadd(key, { score: now, member: String(now) });
    // 4. Update the key expiry to live slightly longer than the window itself
    pipeline.expire(key, windowSeconds + 2);
    
    const results = await pipeline.exec();
    
    // results[1] is the output of the second command (zcard)
    const requestCount = (results[1] as number) || 0;
    const remaining = Math.max(0, limit - requestCount);
    const success = requestCount < limit;
    
    // Reset timestamp: estimate based on oldest item in set
    // Fetch oldest score from sorted set to find when the window resets
    const oldestTimestampStr = await redis.zrange<string[]>(key, 0, 0);
    const oldestTimestamp = oldestTimestampStr && oldestTimestampStr.length > 0
      ? parseInt(oldestTimestampStr[0], 10)
      : now;
    const resetTime = oldestTimestamp + windowMs;

    if (!success) {
      logger.security('rate_limit_exceeded', `Rate limit exceeded for client: ${identifier}`, {
        identifier,
        limit,
        windowSeconds,
        requestCount,
      });
    }

    return {
      success,
      limit,
      remaining,
      reset: Math.ceil((resetTime - now) / 1000),
    };
  } catch (error) {
    logger.error('rate_limit_error', `Rate limiter failed for client: ${identifier}`, {
      identifier,
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fail-open strategy to prevent Redis downtime from taking down the app,
    // but log a warning.
    return {
      success: true,
      limit,
      remaining: 1,
      reset: 0,
    };
  }
}

/**
 * Express-like middleware helper or Route Handler helper to assert rate limit
 */
export async function assertRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const result = await rateLimit(identifier, limit, windowSeconds);
  if (!result.success) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${result.reset} seconds.`, {
      limit: result.limit,
      resetSeconds: result.reset,
    });
  }
}
