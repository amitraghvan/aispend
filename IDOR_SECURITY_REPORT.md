# AISPEND — IDOR Penetration Testing & Tenant Isolation Report

## Executive Summary
An IDOR (Insecure Direct Object Reference) audit and simulated penetration testing suite were executed against all core entity-access endpoints in the AISPEND API. The goal was to verify that no user can read, update, or delete data belonging to another organization (tenant boundary escape).

All tested routes successfully reject cross-tenant operations with proper HTTP status codes (`401 Unauthorized`, `403 Forbidden`, `404 Not Found`).

---

## 1. Audit Targets & Results

| API Endpoint | Vulnerability Vectors Tested | Expected Response | Observed Response | Status |
| :--- | :--- | :---: | :---: | :---: |
| **`/api/audits/[id]`** | Foreign tenant ID, Random UUID, Deleted Audit | `403` / `404` / `401` | `403` / `404` / `401` | **PASS** |
| **`/api/reports/[id]`** | Accessing report of another org, Random UUID | `403` / `404` / `401` | `403` / `404` / `401` | **PASS** |
| **`/api/share/[token]`** | Invalid format token, Expired token, brute-force | `400` / `404` | `400` / `404` | **PASS** |
| **`/api/copilot/*`** | Thread lookup of another org, sending chat messages | `403` / `404` / `401` | `403` / `404` / `401` | **PASS** |
| **`/api/team/*`** | Member deletion of another org, invitation hijacking | `403` / `404` / `401` | `403` / `404` / `401` | **PASS** |
| **`/api/dashboard/*`** | Statistics retrieval of another org | `401` / `403` | `401` / `403` | **PASS** |

---

## 2. Attack Simulation Scenarios

### Scenario A: Random / Formatted UUID Injection
* **Method**: Invoking `/api/audits/00000000-0000-0000-0000-000000000000` or arbitrary UUIDs.
* **Outcome**: Handled gracefully. Handlers search for the resource. If it is missing, `404 Not Found` is returned. If it exists but is under a different tenant org, `403 Forbidden` is returned.

### Scenario B: Foreign Tenant Isolation Escape
* **Method**: Authenticating as `userA` from `orgA` and making requests for resources belonging to `orgB`.
* **Outcome**: Handled gracefully. All query results are filtered by checking the resource's `organizationId` matching `session.organization.id`. If a match is not found, a `403 Forbidden` error is generated.

### Scenario C: Deleted / Revoked Resource Queries
* **Method**: Attempting to query soft-deleted audits or revoked team invitations.
* **Outcome**: Soft-deleted records (matching `deletedAt: null` filtering rules) are treated as non-existent and return `404 Not Found` responses.

---

## 3. Remediated Hotfixes
1. **GET/DELETE `/api/audits/[id]`**: Integrated session verification and enforced ownership checks on `organizationId`.
2. **POST `/api/audits/[id]/report`**: Enforced that reports can only be generated for audits owned by the user's active session organization.
3. **Copilot Conversations `/api/copilot/conversations/[id]`**: Enforced strict `orgId` verification inside `ConversationService`.
4. **Report Share `/api/reports/[id]/share`**: Enforced matching organization checks before allowing public share token creation.
