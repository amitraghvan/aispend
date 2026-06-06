# API Integration & Errors Document - AI Spend Intelligence Platform

This document describes the API request/response formats, authentication headers, rate limit status codes, and enterprise error responses.

## 1. Global Response Envelopes

All platform APIs return structured JSON payloads.

### Success Envelope
For resource creation and queries:
```json
{
  "success": true,
  "data": {
    "id": "audit-uuid-value",
    "status": "PROCESSING",
    "totalSpend": "1250.45",
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-05-31T23:59:59.000Z"
  },
  "timestamp": "2026-06-06T17:30:00.000Z"
}
```

### Error Envelope
Standardized error shape returning a unique error code, matching status code, user-friendly message, and context metadata (e.g. invalid form fields):
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "An audit must contain at least one spend item.",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2026-06-06T17:31:00.000Z",
    "metadata": {
      "items": "empty_array"
    }
  }
}
```

---

## 2. Enterprise Error Code System

We utilize a custom exception tree mapped to standardized HTTP statuses:

| Error Name | Code | HTTP Status | Context Usage |
| :--- | :--- | :--- | :--- |
| **ValidationError** | `VALIDATION_ERROR` | `400 Bad Request` | Zod validation failures or logical dates constraints |
| **AuthenticationError** | `AUTHENTICATION_ERROR` | `401 Unauthorized` | Invalid bearer token or expired session |
| **AuthorizationError** | `AUTHORIZATION_ERROR` | `403 Forbidden` | Insufficient role clearance (e.g. USER attempting OWNER actions) |
| **NotFoundError** | `NOT_FOUND_ERROR` | `404 Not Found` | Audit, Company, or User not found |
| **ConflictError** | `CONFLICT_ERROR` | `409 Conflict` | Attempting to create duplicate unique entity (e.g. User email) |
| **RateLimitError** | `RATE_LIMIT_ERROR` | `429 Too Many Requests` | Exceeded API threshold rate limit |
| **DatabaseError** | `DATABASE_ERROR` | `500 Internal Error` | Postgres operation timeout or constraint error |
| **ExternalServiceError** | `EXTERNAL_SERVICE_ERROR` | `502 Bad Gateway` | Failure communicating with Claude API or Resend API |

---

## 3. Rate Limit Headers

Every `/api/*` endpoint includes rate-limiting details in the response headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 14
```
* `X-RateLimit-Limit`: Maximum requests permitted within the sliding window.
* `X-RateLimit-Remaining`: Requests remaining in the current window.
* `X-RateLimit-Reset`: Number of seconds until the rate limit window resets.
