# Backend Architecture — Phase 3

## Overview

Phase 3 transforms the standalone audit engine into a fully operational backend platform with:
- RESTful API endpoints
- Database persistence via Prisma ORM
- Redis caching
- Event-driven architecture
- Email infrastructure
- Lead capture and scoring
- Shareable report links

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                        API Layer                              │
│  POST /api/audits  GET /api/audits  GET /api/audits/:id       │
│  DELETE /api/audits/:id  POST /api/audits/:id/report          │
│  POST /api/leads   GET /api/share/:token                      │
├───────────────────────────────────────────────────────────────┤
│                    Service Layer                              │
│  AuditOrchestrator  ReportService  LeadService  ShareService  │
│  EmailService       LeadScoringService                        │
├───────────────────────────────────────────────────────────────┤
│                   Repository Layer                            │
│  AuditRepository  RecommendationRepository  ReportRepository  │
│  LeadRepository   AuditShareRepository                        │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│  PostgreSQL │  Redis      │  Event Bus  │  Email (Resend)    │
│  (Prisma)   │  (Cache)    │  (Pub/Sub)  │                    │
└─────────────┴─────────────┴─────────────┴────────────────────┘
│                 Audit Engine (Phase 2 — Protected)             │
│  55 Rules · Savings · Overlap · Health Score · Benchmark       │
└───────────────────────────────────────────────────────────────┘
```

## Database Models (14 tables)

| Model | Purpose |
|-------|---------|
| Company | Organization with employee/developer counts |
| User | Users with roles (OWNER, ADMIN, USER) |
| Audit | Audit results with health score, benchmarks, overlap |
| AuditItem | Individual tool subscriptions |
| Recommendation | Persisted engine recommendations with categories/priorities |
| Report | Generated reports with executive summaries |
| Lead | Captured leads with scoring and UTM tracking |
| AuditShare | Public shareable links with view counting |
| Event | Domain events log |
| EmailLog | Email delivery tracking with retries |
| ToolCatalog | Tool metadata |
| Benchmark | Industry benchmark data |
| Settings | Company-level configuration |
| FeatureFlag | Feature toggles |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/audits | Create and execute audit |
| GET | /api/audits | List audits (paginated, filterable) |
| GET | /api/audits/:id | Get audit by ID |
| DELETE | /api/audits/:id | Soft delete audit |
| POST | /api/audits/:id/report | Generate audit report |
| POST | /api/leads | Capture lead |
| GET | /api/share/:token | View public report |

### Response Format

**Success:**
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 },
  "timestamp": "2026-06-06T18:00:00Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} },
  "timestamp": "2026-06-06T18:00:00Z"
}
```

## Services

### AuditOrchestrator
Full audit pipeline: validate → engine → persist items → persist recommendations → cache → emit events.

### ReportService
Generates structured reports with executive summary, savings breakdown, and recommendation highlights.

### LeadService
Lead capture with Zod validation, disposable email blocking, 24-hour duplicate prevention, and automatic scoring.

### LeadScoringService
Deterministic scoring (HOT/WARM/COLD) based on spend, team size, optimization opportunity, and role seniority.

### EmailService
Resend integration with 3 templates, retry logic (3 attempts, exponential backoff), and email logging.

### ShareService
Creates public shareable report links with PII stripping, optional expiry, and view counting.

## Infrastructure

### Event Bus
- In-memory pub/sub with async fire-and-forget execution
- Events: audit.created, audit.completed, report.generated, lead.captured, email.sent, share.created
- Future-ready for Redis Streams or SQS replacement

### Cache Service
- Redis-backed with namespace isolation
- TTL strategy: Audits (1hr), Pricing (24hr), Benchmarks (24hr), Reports (2hr)
- Graceful degradation on Redis failures

## Testing

**140 tests across 13 files, 100% pass rate**
