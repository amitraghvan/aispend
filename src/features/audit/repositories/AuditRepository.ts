import { prisma } from '@/lib/prisma';
import { DatabaseError, NotFoundError } from '@/lib/errors/AppError';
import { logger } from '@/lib/logger/logger';
import { AuditDomain, CreateAuditInput, UpdateAuditStatusInput } from '../types';

export class AuditRepository {
  /**
   * Find audit by id, strictly verifying soft-delete status.
   */
  async findById(id: string): Promise<AuditDomain | null> {
    try {
      const audit = await prisma.audit.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          items: {
            where: { deletedAt: null },
          },
        },
      });

      return audit as AuditDomain | null;
    } catch (error) {
      logger.error('audit_repository_find_by_id_failed', 'Failed to fetch audit from DB', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Database operation failed when fetching audit.', { id });
    }
  }

  /**
   * Find all active audits for a company.
   */
  async findByCompanyId(companyId: string): Promise<AuditDomain[]> {
    try {
      const audits = await prisma.audit.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return audits as AuditDomain[];
    } catch (error) {
      logger.error('audit_repository_find_by_company_failed', 'Failed to fetch company audits', {
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Database operation failed when fetching company audits.', { companyId });
    }
  }

  /**
   * Create audit and associated items within a single database transaction.
   */
  async create(input: CreateAuditInput): Promise<AuditDomain> {
    try {
      const audit = await prisma.$transaction(async (tx) => {
        // Calculate initial total spend
        let totalSpend = 0;
        input.items.forEach((item) => {
          totalSpend += Number(item.spendAmount);
        });

        // 1. Create the Audit root record
        const createdAudit = await tx.audit.create({
          data: {
            companyId: input.companyId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            totalSpend,
            potentialSavings: 0, // Calculated by AI engine later
            status: 'PROCESSING',
          },
        });

        // 2. Create individual AuditItems
        if (input.items.length > 0) {
          await tx.auditItem.createMany({
            data: input.items.map((item) => ({
              auditId: createdAudit.id,
              toolName: item.toolName,
              modelName: item.modelName ?? null,
              tokensInput: item.tokensInput ?? null,
              tokensOutput: item.tokensOutput ?? null,
              callsCount: item.callsCount ?? null,
              spendAmount: item.spendAmount,
            })),
          });
        }

        return createdAudit;
      });

      logger.audit('audit_created', 'New audit created successfully', {
        auditId: audit.id,
        companyId: input.companyId,
      });

      return audit as AuditDomain;
    } catch (error) {
      logger.error('audit_repository_create_failed', 'Database transaction to create audit failed', {
        companyId: input.companyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to record new audit in database.', { input });
    }
  }

  /**
   * Update audit properties.
   */
  async update(input: UpdateAuditStatusInput): Promise<AuditDomain> {
    try {
      const updated = await prisma.audit.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.totalSpend && { totalSpend: input.totalSpend }),
          ...(input.potentialSavings && { potentialSavings: input.potentialSavings }),
        },
      });

      return updated as AuditDomain;
    } catch (error) {
      logger.error('audit_repository_update_failed', 'Failed to update audit properties', {
        auditId: input.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Database operation failed during audit update.', { input });
    }
  }

  /**
   * Soft-delete audit and cascade to items.
   */
  async softDelete(id: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date();

        // Check if audit exists
        const audit = await tx.audit.findUnique({ where: { id } });
        if (!audit || audit.deletedAt) {
          throw new NotFoundError('Audit not found or already deleted');
        }

        // Soft-delete the audit root
        await tx.audit.update({
          where: { id },
          data: { deletedAt: now },
        });

        // Soft-delete associated audit items
        await tx.auditItem.updateMany({
          where: { auditId: id, deletedAt: null },
          data: { deletedAt: now },
        });
      });

      logger.audit('audit_deleted', 'Audit soft-deleted successfully', { auditId: id });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      
      logger.error('audit_repository_delete_failed', 'Failed to soft delete audit', {
        auditId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Database operation failed during audit deletion.', { id });
    }
  }
}
export const auditRepository = new AuditRepository();
