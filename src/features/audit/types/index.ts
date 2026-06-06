import { AuditStatus, Prisma } from '@prisma/client';

export interface AuditDomain {
  id: string;
  organizationId: string | null;
  status: AuditStatus;
  totalSpend: Prisma.Decimal;
  potentialSavings: Prisma.Decimal;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AuditItemDomain {
  id: string;
  auditId: string;
  toolName: string;
  modelName: string | null;
  tokensInput: bigint | null;
  tokensOutput: bigint | null;
  callsCount: number | null;
  spendAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateAuditInput {
  organizationId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  items: Array<{
    toolName: string;
    modelName?: string;
    tokensInput?: bigint;
    tokensOutput?: bigint;
    callsCount?: number;
    spendAmount: Prisma.Decimal;
  }>;
}

export interface UpdateAuditStatusInput {
  id: string;
  status: AuditStatus;
  totalSpend?: Prisma.Decimal;
  potentialSavings?: Prisma.Decimal;
}
