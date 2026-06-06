# AI Spend Audit Engine — Technical Documentation

## Overview

The Audit Engine is the core intelligence layer of the AI Spend Intelligence Platform. It is a deterministic, rule-based system that:

1. Validates audit input (tool subscriptions)
2. Evaluates 55 optimization rules across 9 AI tools
3. Detects tool overlap and redundancy
4. Computes deduped savings projections
5. Scores portfolio health (0–100)
6. Benchmarks against industry averages
7. Produces a canonical `AuditResult` contract

**No AI is used for calculations or business decisions. All logic is rule-based, deterministic, and testable.**

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   AuditEngineService                      │
│                  (Top-Level Orchestrator)                  │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Rule    │ Savings  │ Overlap  │ Health   │  Benchmark   │
│Evaluator │ Service  │Detection │ Score    │  Service     │
│          │          │ Service  │ Service  │              │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│                    Rule Registry                          │
│          ┌─────────┬─────────┬──────────┐                │
│          │ Plan    │ Overlap │ Billing  │                │
│          │Downgrade│  Rules  │  Rules   │                │
│          │ (15)    │  (20)   │  (20)    │                │
│          └─────────┴─────────┴──────────┘                │
├──────────────────────────────────────────────────────────┤
│                  Tool Catalog + Pricing                   │
│               (9 tools, 30+ plans, $0-$200)              │
└──────────────────────────────────────────────────────────┘
```

---

## Supported Tools

| Tool | Vendor | Category | Plans | Price Range |
|------|--------|----------|-------|-------------|
| Cursor | Cursor | Coding | Hobby, Pro, Business | $0 – $40/seat |
| GitHub Copilot | GitHub | Coding | Free, Pro, Pro+, Business, Enterprise | $0 – $39/seat |
| ChatGPT | OpenAI | Mixed | Free, Plus, Pro, Team, Enterprise | $0 – $200/seat |
| Claude | Anthropic | Mixed | Free, Pro, Team, Enterprise | $0 – $60/seat |
| Gemini | Google | Mixed | Free, Advanced, Business, Enterprise | $0 – $36/seat |
| Anthropic API | Anthropic | Mixed | Pay-as-you-go | Usage-based |
| OpenAI API | OpenAI | Mixed | Pay-as-you-go | Usage-based |
| Windsurf | Codeium | Coding | Free, Pro, Team | $0 – $35/seat |
| v0 | Vercel | Coding | Free, Premium, Team | $0 – $30/seat |

---

## Rule Engine

### Rule Categories

| Category | Rules | Description |
|----------|-------|-------------|
| `plan_downgrade` | PD-001 – PD-012 | Recommend cheaper plan tiers |
| `seat_optimization` | PD-013 – PD-015, BO-011 – BO-013 | Reduce unused seats |
| `overlap_elimination` | OV-001 – OV-015 | Remove redundant tool subscriptions |
| `tool_consolidation` | OV-016 – OV-020 | Merge overlapping tools |
| `billing_optimization` | BO-001 – BO-006, BO-014, BO-019 – BO-020 | Annual billing, spend alerts |
| `unused_resource` | BO-007 – BO-009 | Free tier opportunities |
| `api_optimization` | BO-015 – BO-016 | API vs subscription optimization |
| `feature_alignment` | BO-017 – BO-018 | Ensure right features for use case |

### Rule Anatomy

Every rule produces a `RuleResult` with:

```typescript
{
  ruleId: string;          // Unique rule identifier
  ruleName: string;        // Human-readable name
  category: RuleCategory;  // Classification
  priority: RulePriority;  // critical | high | medium | low
  triggered: boolean;      // Whether the rule fired
  reason: string;          // Explainable justification
  expectedMonthlySavings: number;
  expectedAnnualSavings: number;
  confidenceScore: number; // 0.0 to 1.0
  currentState: string;    // What the customer has now
  recommendedAction: string; // What to do
  affectedToolIds: string[];
}
```

### Key Rules

| Rule | Priority | Description |
|------|----------|-------------|
| PD-003 | Critical | ChatGPT Pro ($200) → Plus ($20) downgrade |
| OV-001 | Critical | Multiple coding assistants detected |
| OV-006 | Critical | Cursor + Copilot overlap |
| OV-007 | Critical | Cursor + Windsurf overlap |
| OV-011 | Critical | Triple AI assistant overlap |
| BO-006 | Critical | Very high spend (>$1000/mo) |
| PD-001 | High | ChatGPT Team → Plus for small teams |
| PD-013 | High | Claude Team excess seats |
| OV-009 | High | Claude API + subscription overlap |
| BO-005 | High | High spend alert (>$500/mo) |

---

## Savings Engine

The Savings Engine calculates total savings from triggered recommendations with deduplication:

1. **Groups** recommendations by affected tool set
2. For each group, takes the **maximum** savings (not sum) to avoid double-counting
3. **Caps** total savings at current spend
4. Calculates a **weighted confidence** score

Example:
- Rule A: Save $20/mo on Cursor
- Rule B: Save $15/mo on Cursor (different optimization)
- **Result**: $20/mo savings (max, not sum)

---

## Overlap Detection

Detects tool overlap across 4 dimensions:

1. **Category overlap**: Multiple coding assistants, multiple general AI tools
2. **Use case overlap**: Multiple tools used for the same purpose (writing, coding, etc.)
3. **API + subscription overlap**: Paying for both API and subscription from same vendor
4. **Cross-vendor overlap**: Using ChatGPT + Claude + Gemini for the same tasks

Each overlap group includes:
- Overlap score (0-100)
- Redundancy score (0-100)
- Consolidation suggestion
- Estimated savings

---

## Health Score

Composite health score (0-100) with 5 weighted subscores:

| Subscore | Weight | Description |
|----------|--------|-------------|
| Spend Efficiency | 30% | How much potential savings exist |
| Tool Consolidation | 25% | How much overlap exists |
| Seat Utilization | 20% | Are seats matched to team size |
| Plan Alignment | 15% | Are teams on the right plan tier |
| Critical Issues | 10% | Number of critical/high recommendations |

**Grades**: A (90+), B (80-89), C (70-79), D (60-69), F (<60)

---

## Benchmark Engine

Compares spend per employee against industry benchmarks:

| Stage | Low (P25) | Median (P50) | High (P75) | Very High (P95) |
|-------|-----------|-------------|------------|-----------------|
| Startup (1-50) | $10/emp | $25/emp | $50/emp | $100/emp |
| Scale-up (51-200) | $15/emp | $35/emp | $60/emp | $120/emp |
| Enterprise (201+) | $20/emp | $45/emp | $80/emp | $150/emp |

**Ratings**: excellent (P0-20), good (P20-40), average (P40-60), below_average (P60-80), poor (P80-100)

---

## Canonical Audit Result

```typescript
interface AuditResult {
  auditId: string;           // Unique audit identifier
  companyId: string;         // Customer identifier
  generatedAt: string;       // ISO timestamp
  healthScore: HealthScoreResult;
  currentSpend: number;      // Total monthly spend
  optimizedSpend: number;    // Spend after optimization
  monthlySavings: number;    // Monthly savings
  annualSavings: number;     // Annual savings
  savingsPercentage: number; // Savings as percentage
  recommendations: RuleResult[];
  overlapAnalysis: OverlapAnalysis;
  benchmarkAnalysis: BenchmarkResult;
  itemCount: number;         // Total subscriptions audited
  toolCount: number;         // Unique tools audited
}
```

---

## File Structure

```
src/features/audit/
├── catalog/
│   ├── data/tool-catalog.ts          # 9 tools, 30+ plans
│   ├── types/index.ts                # ToolCatalogEntry, ToolPlan
│   ├── validators/index.ts           # Zod schemas
│   └── repositories/ToolCatalogRepository.ts
├── pricing/
│   ├── types/index.ts                # PricingLookupResult
│   └── services/PricingService.ts    # Plan lookups, comparisons
└── engine/
    ├── types/
    │   ├── index.ts                  # Rule, AuditResult, HealthScore
    │   └── audit-input.ts            # AuditItemInput, AuditRequest
    ├── rules/
    │   ├── plan-downgrade-rules.ts   # 15 rules (PD-001 – PD-015)
    │   ├── overlap-rules.ts          # 20 rules (OV-001 – OV-020)
    │   ├── billing-rules.ts          # 20 rules (BO-001 – BO-020)
    │   ├── registry.ts               # Central rule registration
    │   └── evaluator.ts              # Stateless rule evaluation
    └── services/
        ├── AuditEngineService.ts     # Top-level orchestrator
        ├── SavingsService.ts         # Deduped savings calculations
        ├── OverlapDetectionService.ts
        ├── HealthScoreService.ts     # 0-100 scoring
        └── BenchmarkService.ts       # Industry comparisons

tests/unit/
├── catalog.test.ts                   # 16 tests
├── pricing.test.ts                   # 10 tests
├── rules.test.ts                     # 20 tests
├── services.test.ts                  # 22 tests
└── audit-engine.test.ts             # 9 tests
```

---

## Testing

**82 total tests**, **100% pass rate**:

- **Catalog**: 16 tests (data integrity, validation, repository)
- **Pricing**: 10 tests (lookups, seat constraints, comparisons)
- **Rules**: 20 tests (plan downgrades, overlaps, billing)
- **Services**: 22 tests (savings, overlap detection, health score, benchmarks)
- **Integration**: 9 tests (full audit pipeline, edge cases)

```bash
npx vitest run
```

---

## Design Principles

1. **Deterministic**: Same input always produces same output
2. **Explainable**: Every recommendation includes a human-readable `reason`
3. **Defensible**: Savings estimates include `confidenceScore` (0-1)
4. **Testable**: Pure functions, no side effects, no external dependencies
5. **Extensible**: Add new rules by implementing the `Rule` interface and registering in the registry
