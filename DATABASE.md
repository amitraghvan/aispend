# Database Architecture Document - AI Spend Intelligence Platform

This document describes the database design, optimization choices, indexes, foreign key configurations, soft delete strategies, and scaling roadmap for the **AI Spend Intelligence Platform**.

## 1. Schema Design Overview

Our PostgreSQL schema is designed for safe multi-tenancy, strict ACID compliance, and high-precision financial recording.

> [!IMPORTANT]
> **Decimal Precision**: All spend amounts are defined as `Decimal` mapped to native `Decimal(15, 4)` and `Decimal(15, 6)` in PostgreSQL. This allows accurate micro-cent tracking for LLM API usages (where costs are measured per 1,000 or million tokens).

### Model Catalog (19 Tables)

| Model Name | Primary Key | Scoping / Multi-Tenancy | Soft Delete? | Key Indexes |
| :--- | :--- | :--- | :--- | :--- |
| **Company** | UUID | Root Tenant | Yes | `id`, `deletedAt` |
| **User** | UUID | `companyId` (Many-to-One) | Yes | `email`, `companyId` |
| **Audit** | UUID | `companyId` (Many-to-One) | Yes | `companyId`, `status`, `periodStart, periodEnd` |
| **AuditItem** | UUID | `auditId` (Many-to-One) | Yes | `auditId`, `toolName` |
| **Recommendation** | UUID | `auditId` (Many-to-One) | Yes | `auditId`, `type` |
| **Report** | UUID | `companyId`, `auditId` | Yes | `shareToken`, `companyId` |
| **Lead** | UUID | Global (Prospects) | Yes | `email`, `status` |
| **ToolCatalog** | UUID | Global Static Catalog | Yes | `name`, `category` |
| **PricingSource** | UUID | `toolCatalogId` | Yes | `toolCatalogId` |
| **PricingHistory** | UUID | `toolCatalogId` | Yes | `toolCatalogId`, `effectiveDate` |
| **Benchmark** | UUID | `toolCatalogId` | Yes | `toolCatalogId`, `industry` |
| **AuditShare** | UUID | `reportId` | Yes | `reportId` |
| **Event** | UUID | `userId`, `companyId` | No (Immutable) | `userId`, `companyId`, `createdAt` |
| **SystemLog** | UUID | Global | No (Immutable) | `level`, `createdAt` |
| **EmailLog** | UUID | Global | No (Immutable) | `recipient`, `status` |
| **ApiUsage** | UUID | `companyId` | No (Interval) | `companyId`, `periodStart, periodEnd` |
| **Referral** | UUID | `referrerId` (User) | Yes | `referrerId`, `referredEmail` |
| **FeatureFlag** | UUID | Global | Yes | `key` |
| **Settings** | UUID | `companyId` (One-to-One) | Yes | `companyId` |

---

## 2. Query Optimization & Indexing Layout

We explicitly define indexes to optimize high-frequency application queries:

### Single & Composite Indexes
1. **Multi-Tenancy Isolation (`companyId`)**: Formally indexed on all tenant-specific tables (`User`, `Audit`, `Report`, `ApiUsage`, `Settings`). This ensures that tenant data is isolated and queried instantly.
2. **Composite Date Range Index (`periodStart, periodEnd`)**: Placed on `Audit` and `ApiUsage` tables to optimize timeline range searches and period audits.
3. **Foreign Keys**: Every relation fields (e.g. `auditId`, `toolCatalogId`) includes an index to prevent nested loops in relational SQL JOINs.
4. **Soft Delete Filtering**: All queries append `WHERE deletedAt IS NULL`. We place an index on `deletedAt` on all soft-deleted models to make these checks extremely fast.

---

## 3. Advanced Database Scaling Roadmap

As transaction volume scales, we will execute the following optimizations:

### Table Partitioning (Future Roadmap)
* **Target Table**: `AuditItem` (contains millions of API logs) and `Event` (audit trail logs).
* **Strategy**: Range partitioning by month or quarter using `createdAt` or `periodStart`. Old partition tables can be archived to cold storage (S3/Supabase Storage) while active tables remain compact, fitting entirely in-memory (RAM).

### Read Replica Routing
* **Compute Separation**: Write queries (Insert/Update/Delete) target the primary Supabase instance (utilizing Prisma 7 Client or connection routing). Read queries target one or more read replicas.
* **Lag Management**: Implement replica lag checks. If replica lag exceeds 1 second, route reads to the primary database to prevent read-after-write consistency bugs.

### Backup Strategy
* **Continuous Archiving**: Enable Supabase Point-in-Time Recovery (PITR) allowing databases to be restored to any specific second up to 7 days.
* **Daily Offsite Backups**: Automate daily logical dumps (`pg_dump`) to an encrypted, isolated AWS S3 bucket with lifecycle policies to delete objects older than 90 days.
