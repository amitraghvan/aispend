# Technical Architecture Document - AI Spend Intelligence Platform

This document describes the design principles, structural layouts, data flows, and systems integration of the **AI Spend Intelligence Platform**.

## 1. Architectural Style & Design Patterns

We adopted a hybrid of **Clean Architecture** and **Domain-Driven Design (DDD)** packaged in a **Feature-Based Layout**. 

```mermaid
graph TD
    User([Users / Browser]) -->|HTTPS Request| Middleware[Next.js Middleware: CSRF, Security Headers, Rate Limiter]
    Middleware -->|Router| Frontend[Next.js 15 App Router / Server Actions / API Routes]
    
    subgraph Enterprise Layers
        Frontend -->|Orchestrates| Services[Service Layer: Domain Business Rules & Cache Read-Through]
        Services -->|Coordinates| Repositories[Repository Pattern: Encapsulated Data Queries]
    end

    subgraph Data & Caching
        Repositories -->|Prisma Client| SupabaseDB[(Supabase PostgreSQL: ACID Transactions)]
        Services -->|HTTP Client| RedisCache[(Upstash Redis: Sliding Window Limits, Cache)]
    end

    subgraph Third-Party Integrations
        Services -->|Inference Call| ClaudeAPI[Anthropic Claude API: Cost Analysis & Savings]
        Services -->|Transactional SMTP| ResendEmail[Resend API: Notifications & Leads Reports]
        Services -->|Telemetry| Sentry[Sentry: Error Tracking & Performance Telemetry]
        Services -->|Analytics| Posthog[PostHog: Product Usage & Growth Funnels]
    end
```

### Key Decisions
1. **Feature-Based Organization**: Code is grouped by business capabilities (e.g. `audit`, `recommendations`, `reports`) rather than technical roles (`controllers`, `models`). This minimizes cognitive load and enhances code discoverability.
2. **Repository Pattern**: We abstract Prisma queries inside Repository classes. This separates storage query syntax from business domain operations, allowing us to mock database calls trivially during tests.
3. **Service Layer**: Business rules (e.g., verifying audit bounds, calculating potential savings) reside strictly in the service layer. Controllers and server actions act as simple entry points.
4. **Serverless Optimized Caching**: Using Upstash Redis via REST API avoids persistent TCP connections, fitting perfectly with Vercel's Serverless/Edge cold start optimization.

---

## 2. Platform Scalability Strategy

The platform is designed to scale horizontally across multi-region serverless endpoints while keeping database operations lean:

| User Tier | Scale Target | Architecture Strategy | Caching Layer |
| :--- | :--- | :--- | :--- |
| **Seed** (100 users) | 10 audits / day | Next.js Serverless + Single Node Supabase | In-memory Next.js caching |
| **Growth** (1,000 users) | 100 audits / day | Add Upstash Redis Cache to throttle database query workloads | API cache: 15m; Audit cache: 1hr |
| **Scale** (10,000 users) | 1,000 audits / day | Enable PostgreSQL Read Replicas; transition compute to Edge Runtime | DB read replica routing |
| **Enterprise** (100k+ users) | 10,000 audits / day | Decouple heavy analysis using Serverless Message Queues (SQS) | Pricing cache: 24hr |

---

## 3. Detailed Component Flow

### Audit Creation Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Startup Admin
    participant Mid as middleware.ts
    participant API as API Handler / Server Action
    participant Svc as AuditService
    participant Repo as AuditRepository
    participant Redis as Redis Cache
    participant DB as Postgres (Supabase)

    User->>Mid: POST /api/audit/trigger (Payload)
    Note over Mid: 1. Verify CSRF Origin<br/>2. Rate Limit Check (Redis sliding window)
    Mid-->>User: [Blocked if rate limit exceeded]
    Mid->>API: Pass Request
    API->>Svc: triggerAudit(input)
    Note over Svc: 3. Zod Input Schema Check<br/>4. Date logic verification
    Svc->>Repo: create(input)
    Note over Repo: 5. Execute DB Transaction
    Repo->>DB: INSERT Audit & AuditItems
    DB-->>Repo: Audit details
    Repo-->>Svc: Saved Audit Domain Model
    Svc->>Redis: Invalidate company cache list:companyId
    Svc-->>API: Success Response
    API-->>User: JSON Status Code 201
```

---

## 4. Performance & Telemetry Architecture

### Caching TTL & Invalidation
- **Pricing Catalog (24hr TTL)**: Tool models and prices change rarely. Cached aggressively.
- **Audit Detail (1hr TTL)**: Live audit summaries during report creation are read-through cached. If an audit is deleted or re-triggered, `invalidate("AUDIT", "detail:id")` is explicitly invoked.
- **API Responses (15m TTL)**: Decreases backend server overhead on high-frequency dashboards.

### Telemetry Pipeline
1. **Sentry**: Captures application exceptions, raw HTTP payload traces, and slow query executions.
2. **PostHog**: Tracks custom telemetry events (e.g. `audit_created`, `report_downloaded`) alongside growth attribution data.
