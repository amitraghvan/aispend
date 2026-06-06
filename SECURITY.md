# Security Architecture Document - AI Spend Intelligence Platform

This document outlines the security architecture, controls, configurations, and best practices implemented within the **AI Spend Intelligence Platform**.

## 1. Gateway Security & Session Configuration

We employ Next.js middleware as the platform's security gateway:

### Secure HTTP Headers
The application enforces strict headers on all responses via `src/middleware.ts`:

- **Content Security Policy (CSP)**: Restricts scripts and connections strictly to `'self'` and authorized endpoints (Supabase, PostHog, Sentry). Inline scripts are blocked except for safe hashes.
- **HSTS (Strict-Transport-Security)**: Enforced with a 1-year max-age, subdomains, and preload flags, forcing all traffic over SSL.
- **X-Frame-Options**: Set to `DENY` to fully prevent clickjacking attacks.
- **X-Content-Type-Options**: Set to `nosniff` to prevent MIME-sniffing exploits.
- **Referrer-Policy**: Set to `strict-origin-when-cross-origin`.

---

## 2. Attack Prevention Strategies

### CSRF Protection
Mutating API operations (POST, PATCH, PUT, DELETE) on `/api/*` endpoints verify the `Origin` and `Host` headers. If they do not match the target deployment URL, the request is rejected with a `403 Forbidden` response before triggering server action parsing.

### Input Sanitization (XSS Prevention)
All incoming payloads and form variables can be passed through our recursive sanitization utility in `src/lib/security/sanitize.ts`.
This cleanses special characters (`<`, `>`, `&`, `"`, `'`, `/`, `` ` ``) into safe HTML entity equivalents, preventing stored or reflected Cross-Site Scripting (XSS).

### SQL Injection Prevention
We use Prisma ORM which leverages parameterized queries (prepared statements) for all relational commands. Dynamic values are never concatenated directly into SQL strings, neutralizing SQL Injection (SQLi) vulnerabilities.

### Sliding-Window Rate Limiting
APIs are protected using a sliding-window rate limiter powered by Upstash Redis.
- **Standard APIs**: 60 requests per minute per IP address.
- **Sensitive Operations** (Authentication, Auditing triggers): Throttled to 5 requests per minute per IP.
- **Action On Violation**: Logs a `SECURITY` event with the logger and returns a `429 Too Many Requests` response.

---

## 3. Access Control (RBAC)

Startups require multi-tenant boundary checks. We define three system roles:

1. **OWNER**: Can modify billing, delete companies, and update system integrations.
2. **ADMIN**: Can trigger audits, review recommendations, generate reports, and manage team members.
3. **USER**: Read-only access to dashboards, reports, and recommendations.

### Role Check Utility
Access scopes are asserted inside services and route handlers:

```typescript
export function assertRole(userRole: UserRole, requiredRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    OWNER: 3,
    ADMIN: 2,
    USER: 1,
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw new AuthorizationError('You do not have permission to execute this operation.');
  }
}
```
All system violations are logged under the `SECURITY` logger level and sent directly to Sentry as a warning.
