# Engineering Reflection (REFLECTION) - AISPEND

This document summarizes the engineering reflections, technical trade-offs, design decisions, and future roadmap directions gathered during the build of the **AISPEND** platform.

---

## 1. Architectural Successes & Key Decisions

### Deterministic Rule Engine vs. LLM Predictions
*   **Decision**: We designed the Core Audit and Savings engines to be entirely deterministic (rule-based TypeScript services) rather than relying on generative AI.
*   **Reflection**: This is one of the strongest architectural decisions of the project. AI is notoriously poor at deterministic math, budget aggregation, and invariant logic. By running 55 structured rules, we guarantee 100% mathematical accuracy and reproducible audits. We reserve the LLM exclusively for *generating narratives and advisory feedback* based on the pruned, deterministic outputs of the engine.

### Decoupled Event Architecture
*   **Decision**: Introduced an in-memory Publish-Subscribe `EventBus` (`src/lib/events/event-bus.ts`) to decouple core business operations (e.g. audit completion) from side effects (e.g. email notifications, lead scoring updates, PostHog logs).
*   **Reflection**: This keeps core services clean, small, and testable. If we want to replace the in-memory pub-sub with a robust distributed broker like Redis Streams or AWS SQS in the future, we only need to change the broker adapter; the service controllers and payload contracts remain identical.

### Tenant Isolation Scopes
*   **Decision**: Enforced tenant-wide scoping (`companyId`) at the data repository level rather than leaving it to route controllers.
*   **Reflection**: Enforcing organization checks in the database repositories dramatically reduces the risk of Broken Access Control (IDOR) vulnerabilities, as individual developers do not need to remember to append scoping clauses to every new endpoint logic.

---

## 2. Technical Debt & Design Trade-offs

### Upstash Redis REST Caching
*   **Trade-off**: We opted for Upstash Redis via its HTTPS REST client over standard TCP connections.
*   **Reasoning**: This optimizes connection pooling and cold-start latencies in serverless environments (Next.js Edge/Serverless functions on Vercel). However, HTTPS introduces minor request/response round-trip overhead compared to a persistent TCP stream. For a dashboard application, this minor overhead is an acceptable trade-off to ensure clean cold starts.

### In-Memory Lead Deduplication
*   **Trade-off**: The lead registration endpoint uses an in-memory `Set` to prevent double-submitting emails within a 24-hour window, rather than database-level unique keys or Redis keys.
*   **Debt**: While this passes the initial tests, in-memory sets do not persist across serverless instances or server restarts. In production, this deduplication must be backed by a Redis key (`lead:dedup:email_hash`) with a 24-hour TTL to be reliable.

### DB Replication Lag Management
*   **Trade-off**: Enforced read-through database models.
*   **Debt**: As traffic grows and Supabase utilizes Read Replicas, writing team invitations or settings updates might experience minor replication lag. Implementing session-consistent reads or querying the primary database node for sensitive dashboard routes will be required.

---

## 3. Key Lessons Learned

1.  **Strict LLM Prompts Are Not Optional**: In Phase 6A, we discovered the LLM attempting to round savings or sum up tool lists on its own, producing minor hallucination errors. The introduction of the *CRITICAL MANDATE: Under no circumstances should you perform any mathematical calculations* instruction in the system prompts resolved this.
2.  **Auth Integration Drives Schema Boundaries**: Building the database and multi-tenancy layers early in Phase 4 and 5 saved substantial refactoring effort, as it established standard identity headers that simplified the Copilot chat API designs.

---

## 4. Future Roadmap & Enhancements

*   **SaaS Integration Scrapers**: Rather than manual tool input, implement OAuth integrations with GCP/AWS, Ramp, or Google Workspace to auto-fetch active seats and tool invoices.
*   **Custom Rule DSL**: Transition the 55 TypeScript rules into a custom domain-specific language (DSL) parsed at runtime. This would allow product managers to write and tweak optimization rules without redeploying code.
*   **Stripe Metered Billing**: Shift from simple annual packages to usage-based billing, charging startups a percentage of their audited savings.
