/**
 * Recommendation Repository
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RecommendationRepository {
  async createMany(auditId: string, recommendations: Prisma.RecommendationCreateManyInput[]) {
    return prisma.recommendation.createMany({
      data: recommendations.map((r) => ({ ...r, auditId })),
    });
  }

  async findByAuditId(auditId: string) {
    return prisma.recommendation.findMany({
      where: { auditId, deletedAt: null },
      orderBy: { estimatedMonthlySavings: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.recommendation.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async markApplied(id: string) {
    return prisma.recommendation.update({
      where: { id },
      data: { isApplied: true, appliedAt: new Date() },
    });
  }

  async findByCategory(auditId: string, category: string) {
    return prisma.recommendation.findMany({
      where: { auditId, category: category as Prisma.EnumRecommendationCategoryFilter, deletedAt: null },
      orderBy: { estimatedMonthlySavings: 'desc' },
    });
  }

  async countByAuditId(auditId: string) {
    return prisma.recommendation.count({
      where: { auditId, deletedAt: null },
    });
  }
}

export const recommendationRepository = new RecommendationRepository();
