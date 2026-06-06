import { auditRepository, AuditRepository } from '../repositories/AuditRepository';
import { cacheService } from '@/lib/cache/cache-service';
import { CreateAuditInput, AuditDomain } from '../types';
import { logger } from '@/lib/logger/logger';
import { ValidationError, NotFoundError } from '@/lib/errors/AppError';
import { Prisma } from '@prisma/client';

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
      organizationId: input.organizationId,
      itemsCount: input.items.length,
    });

    // 1. Validation
    if (input.items.length === 0) {
      throw new ValidationError('An audit must contain at least one spend item.');
    }
    
    if (new Date(input.periodStart) > new Date(input.periodEnd)) {
      throw new ValidationError('Period start date must be before period end date.');
    }

    // 2. Calculate totals
    const totalSpend = input.items.reduce(
      (sum, item) => sum.add(item.spendAmount),
      new Prisma.Decimal(0)
    );

    // 3. Database Creation
    const audit = await this.repo.create({
      organization: input.organizationId ? { connect: { id: input.organizationId } } : undefined,
      totalSpend,
      potentialSavings: new Prisma.Decimal(0),
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    // 4. Create items
    await this.repo.createItems(
      audit.id,
      input.items.map((item) => ({
        auditId: audit.id,
        toolId: item.toolName,
        toolName: item.toolName,
        spendAmount: item.spendAmount,
      }))
    );

    // 5. Clear cache pattern for company audits
    await cacheService.invalidatePattern('audit');

    return audit as unknown as AuditDomain;
  }

  /**
   * Retrieves an audit by ID using a read-through cache strategy.
   */
  async getAuditById(id: string): Promise<AuditDomain> {
    // 1. Check cache first
    const cachedAudit = await cacheService.getAudit<AuditDomain>(id);
    if (cachedAudit) {
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
    await cacheService.setAudit(id, audit);

    return audit as unknown as AuditDomain;
  }

  /**
   * Retrieves all audits for an organization.
   */
  async getOrganizationAudits(organizationId: string): Promise<AuditDomain[]> {
    const { data } = await this.repo.findMany(
      { organizationId },
      { skip: 0, take: 100 }
    );
    return data as unknown as AuditDomain[];
  }

  /**
   * Removes/Soft-deletes an audit.
   */
  async deleteAudit(id: string): Promise<void> {
    const audit = await this.repo.findById(id);
    if (!audit) {
      throw new NotFoundError(`Audit with ID ${id} not found.`);
    }

    await this.repo.softDelete(id);
    await cacheService.invalidate('audit', id);
  }
}

export const auditService = new AuditService();
export default auditService;
