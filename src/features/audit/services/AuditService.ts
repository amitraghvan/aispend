import { auditRepository, AuditRepository } from '../repositories/AuditRepository';
import { cache } from '@/lib/redis/cache';
import { CreateAuditInput, AuditDomain } from '../types';
import { logger } from '@/lib/logger/logger';
import { ValidationError, NotFoundError } from '@/lib/errors/AppError';

export class AuditService {
  private repo: AuditRepository;

  constructor(repo: AuditRepository = auditRepository) {
    this.repo = repo;
  }

  /**
   * Triggers a new AI spend audit.
   */
  async triggerAudit(input: CreateAuditInput): Promise<AuditDomain> {
    logger.info('audit_service_trigger', 'Triggering AI spend audit', {
      companyId: input.companyId,
      itemsCount: input.items.length,
    });

    // 1. Validation
    if (input.items.length === 0) {
      throw new ValidationError('An audit must contain at least one spend item.');
    }
    
    if (new Date(input.periodStart) > new Date(input.periodEnd)) {
      throw new ValidationError('Period start date must be before period end date.');
    }

    // 2. Database Creation (transactional)
    const audit = await this.repo.create(input);

    // 3. Clear cache pattern for company audits
    await cache.invalidatePattern('AUDIT', `list:${input.companyId}`);

    return audit;
  }

  /**
   * Retrieves an audit by ID using a read-through cache strategy.
   */
  async getAuditById(id: string): Promise<AuditDomain> {
    // 1. Check cache first
    const cachedAudit = await cache.get<AuditDomain>('AUDIT', `detail:${id}`);
    if (cachedAudit) {
      // Re-hydrate Date instances parsed from JSON cache
      cachedAudit.periodStart = new Date(cachedAudit.periodStart);
      cachedAudit.periodEnd = new Date(cachedAudit.periodEnd);
      cachedAudit.createdAt = new Date(cachedAudit.createdAt);
      cachedAudit.updatedAt = new Date(cachedAudit.updatedAt);
      return cachedAudit;
    }

    // 2. Cache miss: fetch from repository
    const audit = await this.repo.findById(id);
    if (!audit) {
      throw new NotFoundError(`Audit with ID ${id} not found.`);
    }

    // 3. Save to cache (TTL = 1 hour)
    await cache.set('AUDIT', `detail:${id}`, audit);

    return audit;
  }

  /**
   * Retrieves all audits for a company, caching the list.
   */
  async getCompanyAudits(companyId: string): Promise<AuditDomain[]> {
    const cacheKey = `list:${companyId}`;
    const cachedList = await cache.get<AuditDomain[]>('AUDIT', cacheKey);
    
    if (cachedList) {
      return cachedList.map((audit) => ({
        ...audit,
        periodStart: new Date(audit.periodStart),
        periodEnd: new Date(audit.periodEnd),
        createdAt: new Date(audit.createdAt),
        updatedAt: new Date(audit.updatedAt),
      }));
    }

    const audits = await this.repo.findByCompanyId(companyId);
    await cache.set('AUDIT', cacheKey, audits);
    
    return audits;
  }

  /**
   * Removes/Soft-deletes an audit.
   */
  async deleteAudit(id: string): Promise<void> {
    const audit = await this.repo.findById(id);
    if (!audit) {
      throw new NotFoundError(`Audit with ID ${id} not found.`);
    }

    // Perform soft delete in repository
    await this.repo.softDelete(id);

    // Invalidate detail and list cache
    await cache.invalidate('AUDIT', `detail:${id}`);
    await cache.invalidatePattern('AUDIT', `list:${audit.companyId}`);
  }
}

export const auditService = new AuditService();
export default auditService;
