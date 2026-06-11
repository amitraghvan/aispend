# AISPEND — AI Spend Intelligence & Optimization Platform

A production-grade B2B SaaS platform that helps startups audit their AI spending, discover plan redundancies, eliminate overlapping seats, generate savings recommendations, consult an AI Copilot, and capture qualified leads.

[![Vitest Tests](https://img.shields.io/badge/tests-364%20passed-emerald?style=flat-square)](file:///Users/amitkumar/AISPEND/TESTS.md)
[![TypeScript](https://img.shields.io/badge/typescript-v5-blue?style=flat-square)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/next.js-15.5-black?style=flat-square)](next.config.ts)
[![License](https://img.shields.io/badge/license-proprietary-red?style=flat-square)](file:///Users/amitkumar/AISPEND/LICENSE)

---

## ⚡ Core Features

*   **Deterministic Savings Engine**: Runs 55 strict, verified pricing rules across 9 major AI tools. Avoids LLM math hallucinations to compute exact savings with per-tool group deduplication and a global 85% cap.
*   **5-Step Interactive Wizard & Estimator**: Interactive calculator widget on the landing page and step-by-step audit forms with client-side Zod validation.
*   **AI Spend Copilot Dashboard**: Layered LLM capabilities via Groq/Anthropic Claude to generate contextual:
    *   *30-Day Action Plans* (weekly tasks, priorities, financial impact).
    *   *Deep Dive guides* (root-cause explanations, migration instructions, complexity ratings).
    *   *Executive Briefs* (strategic board-level summaries and peer group comparisons).
*   **Enterprise Multi-Tenancy & Auth**: Fully integrated Supabase Auth with dynamic middleware checking and strict organization scoping (`companyId`) at the data repository level to protect against IDOR.
*   **Rate-Limiting Hardening**: Sliding window rate limits via Upstash Redis (Serverless) protecting chat inputs, team invitations, and report share links.
*   **Observability Pipeline**: Active PostHog growth funnel telemetry logging paired with Sentry exception tracking.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion
*   **Backend**: Server Actions, API Route Handlers, Edge & Node runtimes
*   **Database**: PostgreSQL (Supabase), Prisma ORM
*   **Caching & Limiting**: Upstash Redis (REST Serverless client)
*   **Emails**: Resend SMTP Templates
*   **AI Providers**: Groq / Anthropic Claude API (JSON structured outputs)
*   **Observability**: PostHog, Sentry
*   **Testing**: Vitest, React Testing Library, Playwright

---

## 🚀 Getting Started

### 1. Installation
Ensure you have Node.js 20+ installed. Install project packages:
```bash
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Create your local environment file:
```bash
cp .env.example .env
```
Fill in the credentials for Supabase Postgres, Upstash Redis, Resend SMTP, Groq/Anthropic, Sentry, and PostHog.

### 3. Database Generation
Validate the Prisma models and generate the typesafe client:
```bash
npx prisma validate
npx prisma generate
```

### 4. Run Development Server
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

## 🧪 Verification & Commands

### Running Automated Test Suites
Run the 364 unit and integration tests using Vitest:
```bash
# Run tests once
npm run test

# Run tests in interactive watch mode
npm run test:watch
```

### Linter & Compile Verification
Check for coding standards, formatting, and compile errors:
```bash
# Lint audit
npm run lint

# TypeScript compiler validation
npx tsc --noEmit
```

---

## 📖 System Documentation Map

Use the root-level documents to explore specific sections of the platform:

### Technical Specifications
*   [ARCHITECTURE.md](file:///Users/amitkumar/AISPEND/ARCHITECTURE.md) - System workflows, feature layouts, and Mermaid diagrams.
*   [DATABASE.md](file:///Users/amitkumar/AISPEND/DATABASE.md) - Database schema, replication lag handling, and indexes.
*   [SECURITY.md](file:///Users/amitkumar/AISPEND/SECURITY.md) - IDOR isolation, rate limiting, and security headers.
*   [API.md](file:///Users/amitkumar/AISPEND/API.md) - Payload envelopes, error exceptions, and route references.
*   [PRICING_DATA.md](file:///Users/amitkumar/AISPEND/PRICING_DATA.md) - Verified pricing catalog configurations (plans, seats).
*   [PROMPTS.md](file:///Users/amitkumar/AISPEND/PROMPTS.md) - LLM prompt designs, templates, and Zod validation schemas.
*   [TESTS.md](file:///Users/amitkumar/AISPEND/TESTS.md) - Complete test suite classification and setup profiles.

### Business & Lifecycle logs
*   [DEVLOG.md](file:///Users/amitkumar/AISPEND/DEVLOG.md) - Phased development timeline from setup to security audits.
*   [REFLECTION.md](file:///Users/amitkumar/AISPEND/REFLECTION.md) - Architectural reviews, trade-offs, and design post-mortems.
*   [GTM.md](file:///Users/amitkumar/AISPEND/GTM.md) - Product-Led Growth (PLG) waitlist funnel and lead scoring metrics.
*   [ECONOMICS.md](file:///Users/amitkumar/AISPEND/ECONOMICS.md) - Unit pricing, operational COGS, and gross SaaS margins.
*   [USER_INTERVIEWS.md](file:///Users/amitkumar/AISPEND/USER_INTERVIEWS.md) - Qualitative interviews driving rule optimizations.
*   [LANDING_COPY.md](file:///Users/amitkumar/AISPEND/LANDING_COPY.md) - Marketing copywriting layout structure and FAQs.
*   [METRICS.md](file:///Users/amitkumar/AISPEND/METRICS.md) - KPI definitions for funnels, technical delays, and MRR.
*   [CONTRIBUTING.md](file:///Users/amitkumar/AISPEND/CONTRIBUTING.md) - Commit rules and pull request boundaries.
*   [LICENSE](file:///Users/amitkumar/AISPEND/LICENSE) - Proprietary copyright protection rules.
