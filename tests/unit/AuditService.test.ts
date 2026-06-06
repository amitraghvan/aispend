import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '@/features/audit/services/AuditService';
import { makeAudit } from '../factories/audit';
import { cacheService } from '@/lib/cache/cache-service';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Helper mock functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindFirst = prisma.audit.findFirst as any;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService();
  });

  describe('getAuditById', () => {
    it('should return from cache if cached copy exists', async () => {
      const mockAuditData = makeAudit({ id: 'cached-audit-id' });
      const getSpy = vi.spyOn(cacheService, 'getAudit').mockResolvedValue(mockAuditData);
      
      const result = await service.getAuditById('cached-audit-id');
      
      expect(getSpy).toHaveBeenCalledWith('cached-audit-id');
      expect(result.id).toBe('cached-audit-id');
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache on cache miss', async () => {
      const dbAuditData = makeAudit({ id: 'db-audit-id' });
      vi.spyOn(cacheService, 'getAudit').mockResolvedValue(null);
      const setSpy = vi.spyOn(cacheService, 'setAudit').mockResolvedValue();
      mockFindFirst.mockResolvedValue(dbAuditData);

      const result = await service.getAuditById('db-audit-id');

      expect(mockFindFirst).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith('db-audit-id', dbAuditData);
      expect(result.id).toBe('db-audit-id');
    });

    it('should throw error if audit is not found', async () => {
      vi.spyOn(cacheService, 'getAudit').mockResolvedValue(null);
      mockFindFirst.mockResolvedValue(null);

      await expect(service.getAuditById('missing-id')).rejects.toThrow('Audit with ID missing-id not found.');
    });
  });

  describe('triggerAudit', () => {
    it('should throw ValidationError if date range is inverted', async () => {
      await expect(
        service.triggerAudit({
          companyId: 'company-1',
          periodStart: new Date('2026-06-30'),
          periodEnd: new Date('2026-06-01'),
          items: [{ toolName: 'OpenAI', spendAmount: new Prisma.Decimal(10.0) }],
        })
      ).rejects.toThrow('Period start date must be before period end date.');
    });

    it('should throw ValidationError if spend items are empty', async () => {
      await expect(
        service.triggerAudit({
          companyId: 'company-1',
          periodStart: new Date('2026-06-01'),
          periodEnd: new Date('2026-06-30'),
          items: [],
        })
      ).rejects.toThrow('An audit must contain at least one spend item.');
    });
  });
});
