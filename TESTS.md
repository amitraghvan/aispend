# Testing Framework & Validation (TESTS) - AISPEND

This document describes the testing architecture, test coverage, and validation procedures implemented across the **AISPEND** platform.

---

## 1. Testing Architecture & Stack

We utilize **Vitest** as our primary runner, supplemented by **React Testing Library** for frontend component rendering, and custom mock utilities for backend and serverless integrations.

*   **Test Suite Composition**: 29 test files, containing **353 tests**.
*   **Success Rate**: **100% Passing**.
*   **Average Suite Run Time**: ~7.5 seconds.

---

## 2. Test Suite Classification

### Core Domain Logic (Unit Tests)
*   **Tool Catalog (`catalog.test.ts`)**: 16 tests verifying the integrity of `tool-catalog.ts` structure, plan pricing arrays, and alternative tool mapping entries.
*   **Pricing (`pricing.test.ts`)**: 10 tests verifying pricing lookups, min/max seat constraints, and currency integrity.
*   **Optimization Rules (`rules.test.ts`)**: 20 tests verifying individual rules (e.g. plan downgrades, unused resources, multiple general AI tool redundancies).
*   **Core Services (`services.test.ts`)**: 22 tests verifying the calculations of the Savings engine (grouping, per-tool maximums, 85% cap) and Health Score calculations.

### Orchestration & Integration Tests
*   **Audit Engine (`audit-engine.test.ts`)**: 9 tests checking the complete stateless pipeline, verifying that invalid inputs return 400 errors and complex stacks return structured results.
*   **Copilot Services & APIs (`AuditCopilotServices.test.ts`, `CopilotAPIs.test.ts`)**: Tests verifying context pruning, conversation history storage, read-only session enforcement, and chat route mappings.
*   **Database Repositories (`ConversationRepository.test.ts`, `ReportRepository.test.ts`)**: Tests checking that Prisma queries compile and map cleanly to relational database objects.
*   **Cache Resilience (`cache-service.test.ts`)**: Validates that cache outages fail-over gracefully to database reads without crashing endpoints.

### Security Hardening Suite (`SecurityHardening.test.ts`)
We maintain a dedicated file containing **25 security unit tests** to prevent regressions on critical OWASP Top 10 vulnerabilities:
1.  **IDOR Access Control**: Verifies that any query or delete request for audit details, reports, or chat threads checks if the resource belongs to the session’s `companyId`. Cross-tenant calls trigger `403 Forbidden`.
2.  **Rate Limiting**: Verifies that chat triggers, invitation accepts, and share links hit rate limits. Mocks the Upstash Redis sliding window client.
3.  **SQL Injection Prevention**: Verifies that Prisma inputs are strictly parameterized and validated by Zod schema filters.
4.  **Security Headers**: Checks that Edge Middleware sets Content-Security-Policy (CSP), HSTS, Frame Options, and XSS protection headers.
5.  **Strict Payload Rejection**: Verifies that malformed JSON strings or negative seat values trigger validation errors and exit early.

---

## 3. Running the Test Suites

Ensure dependencies are installed before running verification commands.

### Running Automated Unit & Integration Tests
Executes the full Vitest suite:
```bash
npm run test
```

### Running Tests in Watch Mode
Launches Vitest in interactive watch mode for active coding:
```bash
npm run test:watch
```

### Running Static Type Verification
Ensures TypeScript compiles without error across all components:
```bash
npx tsc --noEmit
```

### Running Linter Checks
Ensures coding standards and format compliance:
```bash
npm run lint
```

---

## 4. Test Mocks & Infrastructure

*   **Setup File**: `tests/setup.ts` configures standard mocks.
*   **Third-Party Mocks**:
    *   **Supabase Client**: Mocked hooks for browser and server clients, simulating login sessions.
    *   **PostHog**: Mocked tracking event calls (`capture`).
    *   **Sentry**: Mocked trace logs and error report handles.
    *   **Upstash Redis REST Client**: Mocked sliding-window rate limiter replies.
