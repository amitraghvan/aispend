# Landing Page Copywriting Guide (LANDING_COPY) - AISPEND

This document serves as the master copy guide and UX wireframe copy for the marketing home page (`/`) of the **AISPEND** platform.

---

## 1. Hero Section (Above the Fold)

*   **Primary Headline**: Stop Wasting Money on Redundant AI Tools.
*   **Supporting Subheadline**: Find overlapping seats, optimize plans, and slash your company's AI tool spend by up to 60% in less than 2 minutes. Free, secure, and entirely deterministic.
*   **Primary Call-to-Action (CTA)**:
    *   *Button Text*: Start Free Audit →
    *   *Microcopy*: No sign-up required. Takes 90 seconds.
*   **Secondary Call-to-Action**:
    *   *Button Text*: Sign In
*   **Social Proof / Sub-text**: Trusted by finance teams at fast-growing startups.

---

## 2. Interactive Spend Estimator Widget

A lightweight calculator element to hook user attention before they launch the multi-step wizard.

*   **Header**: Quick Estimator: What is your monthly AI leakage?
*   **Sliders**:
    *   *Input 1*: Number of developers (e.g. Slider range 1–200, default 15)
    *   *Input 2*: Total team size (e.g. Slider range 5–500, default 30)
    *   *Input 3*: Approximate monthly AI spend (e.g. Slider range $50–$10,000, default $1,200)
*   **Live Output**:
    *   *Calculated Value*: "Estimated Leakage: **$340/mo** ($4,080/yr)"
    *   *Call-to-Action*: Run Full Audit to Find Overlaps →

---

## 3. Core Value Propositions (Features Grid)

### Value Prop 1: 100% Deterministic Rule Engine
*   **Header**: Zero Hallucinations. Pure Math.
*   **Body**: Most SaaS calculators use LLMs to estimate costs, resulting in variable numbers. AISPEND runs a stateless engine executing 55 strict, verified rules mapped directly to official pricing catalogs. Same input, same result, every single time.

### Value Prop 2: Frictionless & Zero Integration
*   **Header**: No Database Integrations Required.
*   **Body**: You don't need to connect your accounting portal or share API tokens to get value. Manually input your tool subscriptions in our 5-step wizard to see immediate optimization plans.

### Value Prop 3: Board-Ready PDF Exports
*   **Header**: Reports Ready for Your CFO.
*   **Body**: Share clean, professional breakdowns containing health score grades (A–F), peer benchmark percentiles, and executive advisory briefings to justify subscription consolidation to leadership.

---

## 4. Product Pricing Tiers Copy

*   **Plan 1: Free Audit**
    *   *Price*: $0 (Forever)
    *   *CTA*: Start Free Audit
    *   *Bullet Points*:
        *   1-time manual audit
        *   Interactive results dashboard
        *   Core health score and grade
        *   Basic savings recommendations
*   **Plan 2: Growth Pro**
    *   *Price*: $19 / mo (Billed annually)
    *   *CTA*: Join Waitlist / Upgrade
    *   *Bullet Points*:
        *   Continuous monthly invoice scanning
        *   Slack integration spend alerts
        *   Access to AI Spend Copilot Chat
        *   PDF report downloads
        *   Up to 5 team members
*   **Plan 3: Enterprise**
    *   *Price*: Custom Pricing
    *   *CTA*: Contact Sales
    *   *Bullet Points*:
        *   Okta / Google Workspace integrations
        *   Automated seat monitoring
        *   Custom SSO/SAML support
        *   Dedicated AI billing accountant

---

## 5. Frequently Asked Questions (FAQ)

### Q: How does the savings calculation work?
**A**: Our engine checks your subscription stack. If you have overlapping tools (e.g., both Cursor and Copilot active for the same team), we group them and recommend consolidating. We take the maximum savings of the group (not the sum) to prevent double-counting, and cap total savings at 85% of your current spend.

### Q: Do you store my company's sensitive credentials?
**A**: No. The free audit is stateless and runs locally. For registered workspaces, our AI context builder strips all API tokens and personally identifiable information (PII) before generating LLM briefings. We are a read-only advisor.

### Q: Can I share my audit results with colleagues?
**A**: Yes. The dashboard generates a public share token. This share token is cryptographically signed and resolves to a view showing only your aggregate statistics and optimization rules, with all user names and email details completely excluded.
