# Go-To-Market & Growth Strategy (GTM) - AISPEND

This document details the Go-To-Market (GTM) plan, growth funnels, and marketing strategies designed to launch and scale **AISPEND** as a leading B2B SaaS utility.

---

## 1. Growth Model: Product-Led Growth (PLG)

Our model relies on a low-friction, high-value utility that encourages organic sharing, minimal acquisition costs, and rapid onboarding.

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Visitor Lands  │ ──> │ Run Manual Audit    │ ──> │ Savings Generated    │
│  (No Signup)    │     │ (5-Step UI Wizard)  │     │ (Instant value lock) │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
                                                                │
                                                                ▼
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ Conversion      │ <── │ Lead Captured       │ <── │ Request Detailed PDF │
│ (Auth Workspace)│     │ (Warm/Hot email)    │     │ or Copilot Access    │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
```

---

## 2. Onboarding & Frictionless Funnel

1.  **Frictionless Entry**: Startups are highly protective of their database and API tokens initially. We do *not* require API integrations, database connections, or credit cards to run a first audit. Users manually choose their tools and tiers in the 5-step wizard.
2.  **Instant Value Realization**: After the 5th wizard step, the user instantly lands on the dashboard `/audit/results`. They see:
    *   Their overall AI Spend Health Score and letter grade.
    *   Total potential monthly and annual savings.
    *   Specific rules triggered (e.g. Cursor + Copilot redundancy).
3.  **Lead Capture Hook**: To lock in the results, generate a shareable token, download a PDF report, or consult the AI Spend Copilot, the user must enter their work email.

---

## 3. Lead Scoring & Re-engagement Funnel

Once a lead is captured, the platform fires a `lead.captured` event to trigger decoupled pipelines:

### Scoring & Sales Prioritization
Leads are scored from 0 to 100 based on their parameters:
*   **HOT (Score ≥ 60)**: Monthly spend >$1,000, team size >50, savings >30%, decision-maker role. Handed over for high-touch founder outreach.
*   **WARM (Score 30–59)**: SMB teams spending $100–1000. Added to an automated product onboarding email funnel.
*   **COLD (Score < 30)**: Freelancers or micro-startups. Placed on self-serve newsletter updates.

### Automated Nurturing Funnel (Resend Email API)
*   **Day 1 (Immediate)**: Personalized report summary with a link to book an optimization consultation.
*   **Day 3**: Case studies of other startups that saved 40%+ by consolidating coding assistants.
*   **Day 7**: Call-to-action to register for a workspace to enable continuous monitoring.

---

## 4. Acquisition Channels & Launch Milestones

### Phase 1: Product Hunt & Hacker News (Days 1–15)
*   Launch as a free tool on **Product Hunt** targeting developers and finance managers.
*   Write a transparent, technical "Show HN" explaining how the deterministic rules engine outperforms generic LLM queries for mathematical audits.
*   Submit the tool to popular directories (e.g., AlternativeTo, SaaSHub).

### Phase 2: VC Portfolio Partnerships (Days 16–45)
*   Reach out directly to startup accelerators (YC, Techstars, Sequoia Scout networks).
*   Offer them a custom "White-Label Accelerator Hub" where VCs can audit their entire portfolio's aggregate AI spend.

### Phase 3: Search Engine Optimization (SEO) (Ongoing)
*   Build comparative landing pages targeting keywords like:
    *   *Cursor vs Copilot vs Windsurf prices*
    *   *How to optimize company ChatGPT seats*
    *   *SaaS spend auditing tools*
