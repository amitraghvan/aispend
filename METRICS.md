# Core Platform Metrics & KPIs (METRICS) - AISPEND

This document defines the key performance indicators (KPIs) categorized by Product Funnel, Technical Execution, and Financial Performance to monitor the growth and stability of **AISPEND**.

---

## 1. Product & Growth Funnel Metrics

We track the customer journey from a guest landing page visit to a paid multi-seat organization workspace.

| Funnel Step | Metric Name | Target Benchmark | Tracking Method |
| :--- | :--- | :--- | :--- |
| **1. Acquisition** | Unique Site Visitors | 10,000 / mo | PostHog pageviews |
| **2. Engagement** | Audit Completion Rate | >80% (Started vs. Finished) | Wizard step tracking events |
| **3. Lead Capture** | Waitlist Conversion | >15% of finished audits | `lead.captured` event |
| **4. Registration** | Workspace Account Creation | >5% of captured leads | Supabase Auth sign-ups |
| **5. Expansion** | Team Invitations Sent | Average 2.4 invites per workspace | `team.invitation.sent` logs |

---

## 2. Technical Latency & Execution Performance

Ensuring sub-second execution ranges is critical to maintaining a frictionless experience on serverless runtimes.

*   **Deterministic Audit Latency**:
    *   *Metric*: Execution time of `AuditEngineService` logic.
    *   *Target*: **<100ms** (deterministic rules compute locally without database or API dependencies).
*   **Database Query Time**:
    *   *Metric*: Prisma query execution logs on Supabase PostgreSQL.
    *   *Target*: **<20ms** (enforced by adding foreign keys and index strategies on `companyId`).
*   **AI Narrative Generation Latency**:
    *   *Metric*: Groq/Claude API round-trip duration.
    *   *Target*: **<2.5 seconds** (using fast edge routing).
*   **Cache Hit Rate**:
    *   *Metric*: Redis successful reads vs. connection total.
    *   *Target*: **>75%** (driven by the 24-hour TTL pricing cache).
*   **System Error Rate**:
    *   *Metric*: HTTP 500 response codes vs. total queries.
    *   *Target*: **<0.1%** (monitored and captured by Sentry).

---

## 3. Financial Metrics (SaaS Growth)

These metrics evaluate the long-term economic model as we launch subscription tiers.

*   **Monthly Recurring Revenue (MRR)**: Target $10k MRR within 6 months.
*   **Average Revenue Per Account (ARPU)**: Target $25/mo across combined paid tiers.
*   **Churn Rate**: Monthly cohort customer subscription loss target **<2%**.
*   **Customer Lifetime Value (LTV)**: Target **>$900** per customer.
*   **Customer Acquisition Cost (CAC)**: Target **<$15** per customer.
*   **LTV to CAC Ratio**: Target **>5:1**.

---

## 4. Aggregate Optimization Metrics

Aggregated metrics showcase the platform's overall market impact:

1.  **Total AI Spend Audited**: Cumulative monthly subscription spend processed.
2.  **Total Monthly Savings Identified**: Aggregate potential cost reductions found.
3.  **Average Savings Percentage**: The average percentage reduction identified (historically ranging **53%–67%** for teams using 2+ coding tools).
4.  **Most Frequent Redundancy Trigger**: The rule category firing most frequently (e.g., *OV-006: Cursor & Copilot seat overlap*).
