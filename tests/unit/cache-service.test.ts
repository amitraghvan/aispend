/**
 * Cache Service Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '@/lib/cache/cache-service';
import { redis } from '@/lib/redis/redis';

vi.mocked(redis!.get).mockResolvedValue(null);
vi.mocked(redis!.set).mockResolvedValue('OK');
vi.mocked(redis!.del).mockResolvedValue(1);
vi.mocked(redis!.keys).mockResolvedValue([]);

describe('CacheService', () => {
  const service = new CacheService('test');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set and get from cache', async () => {
    const data = { foo: 'bar' };
    vi.mocked(redis!.get).mockResolvedValueOnce(JSON.stringify(data));

    await service.set('ns', 'id1', data, 3600);
    const result = await service.get<typeof data>('ns', 'id1');
    expect(result).toEqual(data);
  });

  it('should return null for cache miss', async () => {
    vi.mocked(redis!.get).mockResolvedValueOnce(null);
    const result = await service.get('ns', 'missing');
    expect(result).toBeNull();
  });

  it('should invalidate cached key', async () => {
    await service.invalidate('ns', 'id1');
    expect(redis!.del).toHaveBeenCalledWith('test:ns:id1');
  });

  it('should invalidate pattern', async () => {
    vi.mocked(redis!.keys).mockResolvedValueOnce(['test:ns:a', 'test:ns:b']);
    await service.invalidatePattern('ns');
    expect(redis!.keys).toHaveBeenCalledWith('test:ns:*');
    expect(redis!.del).toHaveBeenCalledTimes(2);
  });

  it('should use audit convenience methods', async () => {
    const data = { auditId: '123' };
    await service.setAudit('123', data);
    expect(redis!.set).toHaveBeenCalledWith('test:audit:123', JSON.stringify(data), { ex: 3600 });
  });

  it('should use pricing convenience methods', async () => {
    const data = { price: 20 };
    await service.setPricing('cursor-pro', data);
    expect(redis!.set).toHaveBeenCalledWith('test:pricing:cursor-pro', JSON.stringify(data), { ex: 86400 });
  });

  it('should use benchmark convenience methods', async () => {
    const data = { percentile: 50 };
    await service.setBenchmark('startup', data);
    expect(redis!.set).toHaveBeenCalledWith('test:benchmark:startup', JSON.stringify(data), { ex: 86400 });
  });

  it('should use report convenience methods', async () => {
    const data = { summary: 'test' };
    await service.setReport('r1', data);
    expect(redis!.set).toHaveBeenCalledWith('test:report:r1', JSON.stringify(data), { ex: 7200 });
  });

  it('should handle redis errors gracefully on get', async () => {
    vi.mocked(redis!.get).mockRejectedValueOnce(new Error('conn error'));
    const result = await service.get('ns', 'id');
    expect(result).toBeNull();
  });

  it('should handle redis errors gracefully on set', async () => {
    vi.mocked(redis!.set).mockRejectedValueOnce(new Error('conn error'));
    // // Should not throw
    await expect(service.set('ns', 'id', { x: 1 })).resolves.toBeUndefined();
  });
});
