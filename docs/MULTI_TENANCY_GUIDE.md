# Multi-Tenancy & Tenant Isolation Guide

This document outlines the multi-tenancy model and isolation safeguards implemented in AI Spend.

## The Tenant Model

Our tenant boundary is the `Organization` model. Every user must belong to at least one organization via the `Membership` model.

```
┌──────────────────┐
│   Organization   │
└────────┬─────────┘
         │ 1
         │
         │ *
┌────────┴─────────┐
│    Membership    │
└────────┬─────────┘
         │ *
         │
         │ 1
┌────────┴─────────┐
│       User       │
└──────────────────┘
```

### Roles and RBAC Matrix

We support three roles within an organization:

| Role | Description | Permissions |
| :--- | :--- | :--- |
| `OWNER` | Full control of organization | Delete workspace, billing, change roles, invite team, delete audits. |
| `ADMIN` | Administrative access | Update settings, invite team, manage/remove members, delete audits. |
| `MEMBER` | Standard access | Run audits, create reports, view audits, list members. |

## Query-Level Tenant Scoping

To prevent developers from accidentally writing queries that return other tenants' data, we use tenant helpers in `src/lib/auth/tenant-context.ts`:

### 1. Filtering Queries

Wrap your where filters in `withTenantFilter`:

```typescript
const session = await requireAuth();
const tenant = getTenantContext(session);

const audits = await prisma.audit.findMany({
  where: withTenantFilter(tenant, {
    status: 'COMPLETED',
  }),
});
```

### 2. Scoping Inserts

Ensure that all created records automatically inherit the correct `organizationId`:

```typescript
const audit = await prisma.audit.create({
  data: withTenantCreate(tenant, {
    status: 'PROCESSING',
    totalSpend: 0,
  }),
});
```

### 3. Verification & Guardrails

Always validate ownership when retrieving single resources by ID:

```typescript
const audit = await prisma.audit.findUnique({ where: { id } });
const error = validateOwnership(session, audit?.organizationId);
if (error) return error; // Returns a 404 response
```
