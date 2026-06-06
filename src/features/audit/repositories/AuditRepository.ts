/**
 * Audit Repository — Database operations for Audit and AuditItem models.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditFilters {
  organizationId?: string;
  status?: string;
  healthScoreMin?: number;
  healthScoreMax?: number;
}

export interface PaginationOptions {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export class AuditRepository {
  async create(data: Prisma.AuditCreateInput) {
    return prisma.audit.create({ data, include: { items: true, recommendations: true } });
  }

  async findById(id: string) {
    return prisma.audit.findFirst({
      where: { id, deletedAt: null },
      include: { items: true, recommendations: true, reports: true },
    });
  }

  async findMany(filters: AuditFilters, pagination: PaginationOptions) {
    const where: Prisma.AuditWhereInput = { deletedAt: null };
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.status) where.status = filters.status as Prisma.EnumAuditStatusFilter;
    if (filters.healthScoreMin !== undefined || filters.healthScoreMax !== undefined) {
      where.healthScore = {};
      if (filters.healthScoreMin !== undefined) where.healthScore.gte = filters.healthScoreMin;
      if (filters.healthScoreMax !== undefined) where.healthScore.lte = filters.healthScoreMax;
    }

    const [data, total] = await prisma.$transaction([
      prisma.audit.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.orderBy ?? { createdAt: 'desc' },
        include: { items: true, recommendations: true },
      }),
      prisma.audit.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.AuditUpdateInput) {
    return prisma.audit.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.audit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createItems(auditId: string, items: Prisma.AuditItemCreateManyInput[]) {
    return prisma.auditItem.createMany({
      data: items.map((item) => ({ ...item, auditId })),
    });
  }

  async findItemsByAuditId(auditId: string) {
    return prisma.auditItem.findMany({
      where: { auditId, deletedAt: null },
    });
  }
}

export const auditRepository = new AuditRepository();
