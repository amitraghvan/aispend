# API Reference

## Base URL
```
https://aispend.io/api
```

## Authentication
All endpoints require authentication via Bearer token (future implementation).
The `/api/share/:token` endpoint is public.

## Response Format
All responses use standardized JSON format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 },
  "timestamp": "2026-06-06T18:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "timestamp": "2026-06-06T18:00:00.000Z"
}
```

---

## POST /api/audits
Create and execute an AI spend audit.

### Request Body
```json
{
  "companyId": "uuid",
  "items": [
    {
      "toolId": "cursor",
      "toolName": "Cursor",
      "planName": "Pro",
      "monthlySpend": 20,
      "seatCount": 1,
      "teamSize": 1,
      "useCase": "coding"
    }
  ],
  "totalEmployees": 50,
  "totalDevelopers": 20
}
```

### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| companyId | UUID | Yes | Company identifier |
| items | Array | Yes | Tool subscriptions (min 1) |
| items[].toolId | string | Yes | Tool identifier (e.g., "cursor", "chatgpt") |
| items[].toolName | string | Yes | Human-readable tool name |
| items[].planName | string | Yes | Plan name (e.g., "Pro", "Business") |
| items[].monthlySpend | number | Yes | Monthly cost (≥0) |
| items[].seatCount | integer | Yes | Number of seats (≥1) |
| items[].teamSize | integer | Yes | Actual team members using tool (≥1) |
| items[].useCase | enum | Yes | One of: coding, writing, research, data, mixed |
| totalEmployees | integer | No | Total company employees |
| totalDevelopers | integer | No | Total developers |

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "auditId": "uuid",
    "companyId": "uuid",
    "status": "COMPLETED",
    "currentSpend": 1600,
    "optimizedSpend": 800,
    "monthlySavings": 800,
    "annualSavings": 9600,
    "savingsPercentage": 50,
    "healthScore": 45,
    "healthGrade": "D",
    "recommendationCount": 12,
    "overlapGroupCount": 3,
    "itemCount": 5,
    "toolCount": 5,
    "createdAt": "2026-06-06T18:00:00.000Z"
  }
}
```

---

## GET /api/audits
List audits with pagination and filtering.

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| pageSize | integer | 20 | Items per page (max 100) |
| companyId | UUID | - | Filter by company |
| status | string | - | Filter by status (DRAFT, PROCESSING, COMPLETED, FAILED) |
| healthScoreMin | integer | - | Minimum health score |
| healthScoreMax | integer | - | Maximum health score |

### Response (200 OK)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 45, "totalPages": 3 },
  "timestamp": "..."
}
```

---

## GET /api/audits/:id
Get audit by ID with items and recommendations.

### Response (200 OK)
Returns full audit with items, recommendations, and reports.

---

## DELETE /api/audits/:id
Soft delete an audit.

### Response (200 OK)
```json
{ "success": true, "data": { "id": "uuid", "deleted": true } }
```

---

## POST /api/audits/:id/report
Generate a report for a completed audit.

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "shareToken": "hex-string"
  }
}
```

---

## POST /api/leads
Capture a new lead.

### Request Body
```json
{
  "email": "john@company.com",
  "name": "John Doe",
  "companyName": "Acme Corp",
  "role": "CTO",
  "teamSize": 50,
  "monthlySpend": 2000,
  "utmSource": "google",
  "utmCampaign": "launch"
}
```

### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "leadId": "uuid",
    "status": "created",
    "score": "HOT",
    "scoreValue": 85
  }
}
```

### Validation
- Valid email required
- Disposable email domains blocked
- Duplicate leads within 24 hours return `status: "exists"` silently

---

## GET /api/share/:token
View a public shared report (no authentication required).

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "healthScore": 45,
    "healthGrade": "D",
    "currentSpend": 1600,
    "optimizedSpend": 800,
    "monthlySavings": 800,
    "annualSavings": 9600,
    "savingsPercentage": 50,
    "toolCount": 5,
    "recommendationCount": 12,
    "overlapGroupCount": 3,
    "benchmarkPercentile": 75,
    "benchmarkRating": "below_average"
  }
}
```

Note: No company names, emails, or PII are exposed in shared reports.

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
