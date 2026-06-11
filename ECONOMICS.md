# SaaS Unit Economics & Pricing Model (ECONOMICS) - AISPEND

This document outlines the pricing tiers, Operational Cost of Goods Sold (COGS), margins, and projected Customer Lifetime Value (LTV) to Customer Acquisition Cost (CAC) dynamics of the **AISPEND** platform.

---

## 1. Monetization & Pricing Tiers

We offer a freemium model designed to scale usage while capturing enterprise value.

| Plan | Pricing | Target | Key Features |
| :--- | :--- | :--- | :--- |
| **Free Audit** | **$0** (No Signup) | Solo / Seed Teams | 1-time manual audit, web dashboard, core optimization metrics, basic recommendations. |
| **Growth Pro** | **$19/mo** (Billed Annually) | Startups (1–50 employees) | Continuous monthly sync via invoice/email scraper, slack spend alerts, up to 5 team seats, access to AI Spend Copilot, PDF downloads. |
| **Enterprise** | **$79/mo** (Billed Annually) | Scale-ups (50+ employees) | Custom workspace integrations (Ramp, AWS, GCP, Okta), custom SSO/SAML, audit logs, unlimited seats, SOC2 compliance reports, dedicated accountant support. |

---

## 2. Infrastructure COGS & Operational Cost Structure

Operating in a serverless and edge-optimized configuration allows the platform to maintain extremely low overhead.

### Infrastructure Allocation (Estimated per Monthly Active Company)
1.  **Serverless Hosting (Vercel)**:
    *   Cost model: $20/month per developer seat + execution variables.
    *   Per active company: **~$0.02/mo** (edge routes compile within <50ms).
2.  **Database Connection (Supabase)**:
    *   Cost model: $25/month base (includes 8GB storage, backups, and point-in-time recovery).
    *   Per active company: **~$0.05/mo** (optimized index filters, lightweight records).
3.  **Cache & Rate Limiting (Upstash Redis REST)**:
    *   Cost model: $0.20 per 10k REST command requests.
    *   Per active company: **~$0.01/mo** (used for rate-limiting sliders and tool lookups).
4.  **Transactional Email (Resend)**:
    *   Cost model: Free tier (100 emails/day) -> Pro tier ($20/mo for 50k emails).
    *   Per active company: **~$0.02/mo** (audit reports and invite tokens).

### AI Inference Cost (Groq / Anthropic APIs)
Our strict prompt isolation (pruning context and banning math logic) keeps input tokens compact (~3k tokens input, ~500 tokens output).

*   **Groq API (Diagnostics)**: Using LLaMA-3 models on Groq at ~$0.05/M input tokens and ~$0.08/M output tokens.
    *   *Cost per Audit*: **~$0.0002** (extremely negligible).
*   **Anthropic Claude API (Enterprise Copilot)**: Using Claude 3.5 Sonnet at $3.00/M input tokens and $15.00/M output tokens.
    *   *Cost per Audit*: **~$0.009** (under 1 cent).
    *   *Cost per Chat Thread (5 turns)*: **~$0.04**.

### Combined COGS Summary
*   **Cost to serve a Free User audit**: **~$0.015**
*   **Cost to serve a Paid Growth Pro User (with continuous monitoring + copilot)**: **~$0.25/mo**
*   **Gross Margin**: **>98%**

---

## 3. LTV to CAC Projections

*   **Estimated Customer Acquisition Cost (CAC)**: **$15** (primarily driven by PLG content, word-of-mouth product links, and targeted search ads).
*   **Estimated Average Revenue Per Account (ARPU)**: **$19/mo** ($228/yr).
*   **Customer Lifetime Value (LTV)**:
    *   Assuming a 2% monthly subscriber churn.
    *   Average customer lifespan = 50 months.
    *   LTV = 50 months * $19 = **$950**
*   **LTV : CAC Ratio**: **~63 : 1** (Excellent efficiency, standard venture scale is >3:1).
