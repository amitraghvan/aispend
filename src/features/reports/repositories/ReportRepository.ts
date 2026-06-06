/**
 * Report Repository
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class ReportRepository {
  async create(data: Prisma.ReportCreateInput) {
    return prisma.report.create({ data });
  }

  async findById(id: string) {
    return prisma.report.findFirst({
      where: { id, deletedAt: null },
      include: { audit: true, shares: true },
    });
  }

  async findByShareToken(shareToken: string) {
    return prisma.report.findFirst({
      where: { shareToken, deletedAt: null },
      include: { audit: { include: { items: true, recommendations: true } } },
    });
  }

  async findByAuditId(auditId: string) {
    return prisma.report.findMany({
      where: { auditId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrganizationId(organizationId: string, skip: number, take: number) {
    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where: { organizationId, deletedAt: null },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where: { organizationId, deletedAt: null } }),
    ]);
    return { data, total };
  }

  async update(id: string, data: Prisma.ReportUpdateInput) {
    return prisma.report.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const reportRepository = new ReportRepository();
