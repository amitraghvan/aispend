import { AuditDomain, AuditItemDomain } from '@/features/audit/types';
import { Prisma } from '@prisma/client';

export function makeAudit(overrides?: Partial<AuditDomain>): AuditDomain {
  return {
    id: 'audit-uuid-1',
    organizationId: 'company-uuid-1',
    status: 'COMPLETED',
    totalSpend: new Prisma.Decimal(1250.45),
    potentialSavings: new Prisma.Decimal(230.15),
    periodStart: new Date('2026-05-01T00:00:00Z'),
    periodEnd: new Date('2026-05-31T23:59:59Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function makeAuditItem(overrides?: Partial<AuditItemDomain>): AuditItemDomain {
  return {
    id: 'item-uuid-1',
    auditId: 'audit-uuid-1',
    toolName: 'OpenAI',
    modelName: 'gpt-4o',
    tokensInput: BigInt(1500000),
    tokensOutput: BigInt(3000000),
    callsCount: 450,
    spendAmount: new Prisma.Decimal(52.5),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}
