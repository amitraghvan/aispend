# Event System

## Overview
In-memory publish-subscribe event bus for decoupled cross-cutting concerns. Fire-and-forget async execution with error isolation between handlers.

## Events

| Event | Payload | When |
|-------|---------|------|
| `audit.created` | `{ auditId, companyId }` | Audit record created |
| `audit.processing` | `{ auditId, companyId }` | Audit engine started |
| `audit.completed` | `{ auditId, companyId, healthScore, monthlySavings, recommendationCount }` | Audit finished |
| `audit.failed` | `{ auditId, companyId, error }` | Audit engine error |
| `report.generated` | `{ reportId, auditId, companyId, shareToken }` | Report created |
| `lead.captured` | `{ leadId, email, score, scoreValue, factors }` | Lead created |
| `lead.scored` | `{ leadId, score, scoreValue }` | Lead re-scored |
| `email.sent` | `{ emailLogId, recipient, template }` | Email delivered |
| `email.failed` | `{ emailLogId, recipient, template, error }` | Email delivery failed |
| `share.created` | `{ reportId, publicToken }` | Share link created |
| `share.viewed` | `{ shareId, publicToken }` | Share link accessed |

## Usage

```typescript
import { eventBus } from '@/lib/events/event-bus';

// Subscribe
eventBus.on('audit.completed', async (event) => {
  console.log('Audit completed:', event.payload);
});

// Publish
await eventBus.publish('audit.completed', { auditId: '...', healthScore: 85 }, 'correlation-id');
```

## Future Migration
The `EventBus` class can be replaced with Redis Streams, AWS SQS, or any message broker. The `publish()` and `on()` API surface remains the same.

---

# Report Service

## Overview
Generates structured audit reports from completed audits.

## Report Structure
- **Executive Summary**: Natural language overview of findings
- **Savings Summary**: Current vs optimized spend breakdown
- **Top Recommendations**: Top 5 highest-impact recommendations
- **Health Score**: Score, grade, and summary
- **Benchmark**: Spend per employee, percentile, rating

## Share System
- Public tokens with no PII exposure
- Optional expiry (days)
- View count tracking
- Deactivation support

---

# Lead System

## Lead Scoring
Deterministic scoring based on 5 factors (max 100 points):

| Factor | Max Points | Criteria |
|--------|-----------|----------|
| Monthly Spend | 30 | >$1000 = 30, $500-1000 = 20, $100-500 = 10 |
| Team Size | 20 | 50+ = 20, 20-50 = 15, 5-20 = 10 |
| Savings Opportunity | 25 | >30% = 25, 15-30% = 15, 5-15% = 8 |
| Savings Amount | 15 | >$500/mo = 15, $100-500 = 10 |
| Role | 10 | Decision-maker = 10, other = 3 |

**Tiers**: HOT (≥60), WARM (30-59), COLD (<30)

## Spam Protection
- Disposable email domain blocking (6 domains)
- 24-hour duplicate prevention
- IP/User-Agent logging
