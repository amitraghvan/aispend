# Contributing Guidelines - AI Spend Intelligence Platform

This document describes the workflow, coding standards, branch conventions, and testing protocols required of all engineers contributing to the **AI Spend Intelligence Platform**.

## 1. Branching & Git Workflows

We follow a structured branching strategy to maintain release stability:

* **`main`**: Represents the current production release. Directly locked. Code enters only via approved Pull Requests from `develop`.
* **`develop`**: The primary integration branch. All feature branches merge here.
* **`feature/*`**: Feature development. Created off `develop`, merged back to `develop`.
* **`bugfix/*`**: Bug fixes for active development. Created off `develop`.
* **`hotfix/*`**: Immediate patches for production bugs. Created off `main` and merged to both `main` and `develop`.

### Pull Request Rules
1. **Approval**: Every pull request requires at least 1 peer approval before merge.
2. **CI Pipeline Pass**: Automated CI workflows (linting, tests, build, and security scans) MUST succeed before merging.
3. **No Force Pushes**: Direct force pushes to `main` or `develop` are blocked.

---

## 2. Commit Message Guidelines

We use the **Conventional Commits** standard to enable automated changelogs and versioning.

Format:
`type(scope): subject`

### Allowed Types
- **`feat`**: A new feature (e.g. `feat(audit): add soft delete endpoint`)
- **`fix`**: A bug fix (e.g. `fix(rate-limit): correct reset math in sliding window`)
- **`docs`**: Documentation changes (e.g. `docs(api): update rate limit table`)
- **`style`**: Formats, semi-colons, white spaces (no logic changes)
- **`refactor`**: Restructuring logic without changing public API behavior
- **`test`**: Adding or modifying test suites
- **`chore`**: Upgrading dependencies, script updates, or CLI tools

---

## 3. Local Development Workflows

### 1. Project Spin Up
Install dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Database Commands
Validate database schema matches Prisma specifications:
```bash
npx prisma validate
```
Generate Prisma client:
```bash
npx prisma generate
```

### 3. Verification & Testing
Always run the linter and TypeScript compiler check before pushing:
```bash
# Code formatting check
npm run lint

# TypeScript verification
npx tsc --noEmit
```

Execute unit tests:
```bash
# Single execution run
npm run test

# Watch mode for active development
npm run test:watch
```
