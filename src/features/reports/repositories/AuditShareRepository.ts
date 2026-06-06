/**
 * AuditShare Repository — Shareable report infrastructure
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class AuditShareRepository {
  async create(data: Prisma.AuditShareCreateInput) {
    return prisma.auditShare.create({ data });
  }

  async findByPublicToken(publicToken: string) {
    return prisma.auditShare.findFirst({
      where: { publicToken, isActive: true, deletedAt: null },
      include: { report: { include: { audit: true } } },
    });
  }

  async incrementViewCount(id: string) {
    return prisma.auditShare.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async deactivate(id: string) {
    return prisma.auditShare.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findByReportId(reportId: string) {
    return prisma.auditShare.findMany({
      where: { reportId, deletedAt: null },
    });
  }
}

export const auditShareRepository = new AuditShareRepository();
