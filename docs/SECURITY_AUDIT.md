# Security Audit & Platform Hardening

This document outlines the security controls, validations, and hardening measures deployed in AI Spend.

## Core Protections

### 1. Data Isolation & Multi-Tenancy
- **Tenant Scope**: Database models (`Audit`, `Report`, `Lead`, `OrgSettings`) are mapped to `organizationId`.
- **Database Schema RLS**: In production, Supabase PostgreSQL Row Level Security (RLS) is enabled on all tables, ensuring no SQL query can read cross-tenant data even if a software bug bypasses filters.
- **API Guardrails**: Checked in API routes via `validateOwnership` returning generic 404 responses for cross-tenant attempts to prevent ID enumeration/probing.

### 2. Authentication & Cryptography
- **Secure Transport**: HTTPS is strictly enforced in middleware headers (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
- **Token Security**: Supabase JWT tokens are parsed securely and verified at the Next.js middleware boundary using cryptographic secrets.
- **Cookies**: HTTP-only, secure, SameSite=Lax cookies are utilized for browser sessions, protecting against XSS token extraction.

### 3. Application Hardening
- **SQL Injection**: All database operations go through Prisma ORM, which parameterized SQL statements natively, mitigating SQLi hazards.
- **Rate Limiting**: Configured in middleware via Upstash Redis token bucket limiters to throttle brute-force/DDoS requests on login and sign-up paths.
- **Input Validation**: All APIs validate payloads with Zod schemas before running business logic, rejecting malicious parameters early.
- **Sanitized Logging**: Core components use a logger wrapper (`src/lib/logger/logger.ts`) that redacts passwords, tokens, API keys, and PII from stderr output.
