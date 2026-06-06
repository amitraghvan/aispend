# AI Spend Intelligence Platform (Phase 1 Foundation)

A startup-grade B2B SaaS platform that helps startups audit their AI spending, identify overspending, discover optimization opportunities, generate savings recommendations, create shareable reports, and generate qualified leads.

> [!IMPORTANT]
> This codebase represents **Phase 1 Only** (foundations, schemas, logging, errors, configuration, DevOps, testing setup, and documentation). Interactive UIs and analysis engines belong to subsequent phases.

---

## ⚡ Tech Stack

* **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI
* **Backend**: Next.js Server Actions, API Route Handlers
* **Database**: PostgreSQL, Prisma ORM, Supabase
* **Caching**: Upstash Redis (Serverless)
* **Email**: Resend
* **AI Provider**: Anthropic Claude API
* **Observability**: PostHog, Sentry
* **CI/CD**: GitHub Actions
* **Testing**: Vitest, React Testing Library, Playwright

---

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have Node.js 20+ installed on your system.

### 2. Dependency Installation
Initialize packages using:
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Create a local `.env` file from the example:
```bash
cp .env.example .env
```
Fill in the credentials for Supabase, Upstash Redis, Resend, Anthropic, Sentry, and PostHog.

### 4. Database Setup
Validate the Prisma schema config:
```bash
npx prisma validate
```

Generate the Prisma Client code:
```bash
npx prisma generate
```

---

## 🧪 Verification & Commands

### Running Unit Tests
We use Vitest for unit and integration testing. Run tests locally using:
```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

### Linter & Type Verification
Ensure code matches formatting standards and compiles:
```bash
# Lint checks
npm run lint

# TypeScript verification
npx tsc --noEmit
```

### Next.js Dev Server
To launch the hot-reloading development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 📖 System Documentation Directory

Refer to the primary documents for structural details:
* [ARCHITECTURE.md](file:///Users/amitkumar/AISPEND/ARCHITECTURE.md) - System workflows, feature layouts, and Mermaid diagrams.
* [DATABASE.md](file:///Users/amitkumar/AISPEND/DATABASE.md) - PostgreSQL configurations, indexes, soft-delete, and replication lag management.
* [SECURITY.md](file:///Users/amitkumar/AISPEND/SECURITY.md) - Security headers, CSRF matches, rate limiting, and RBAC rules.
* [API.md](file:///Users/amitkumar/AISPEND/API.md) - Global payload wrappers and error classifications.
* [CONTRIBUTING.md](file:///Users/amitkumar/AISPEND/CONTRIBUTING.md) - Repository protocols, commit types, and Pull Request boundaries.
