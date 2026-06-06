/**
 * Lead Repository
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface LeadFilters {
  status?: string;
  score?: string;
  email?: string;
}

export class LeadRepository {
  async create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  }

  async findById(id: string) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return prisma.lead.findFirst({
      where: { email, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(filters: LeadFilters, skip: number, take: number) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.EnumLeadStatusFilter;
    if (filters.score) where.score = filters.score as Prisma.EnumLeadScoreFilter;
    if (filters.email) where.email = { contains: filters.email, mode: 'insensitive' };

    const [data, total] = await prisma.$transaction([
      prisma.lead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.lead.count({ where }),
    ]);
    return { data, total };
  }

  async update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  }

  async isDuplicate(email: string, windowMs: number = 86400000): Promise<boolean> {
    const since = new Date(Date.now() - windowMs);
    const count = await prisma.lead.count({
      where: { email, createdAt: { gte: since }, deletedAt: null },
    });
    return count > 0;
  }

  async softDelete(id: string) {
    return prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const leadRepository = new LeadRepository();
