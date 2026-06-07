# Phase 6B — AI Spend Copilot Architecture Documentation

This document outlines the technical design, database schemas, subservices, and data flow for the **AI Spend Copilot** in the AISPEND platform.

---

## 1. Overview & Objectives

The AI Spend Copilot transitions AISPEND from a static audit scanning tool into an interactive spend optimization partner. The system is designed under strict constraints to ensure enterprise compliance and safety:

1. **Deterministic Execution**: The AI Copilot is strictly read-only. It has no capabilities to update financial values, run actions, or adjust database configurations.
2. **Context Sanitization**: Personal Identifiable Information (PII), credentials, private tokens, and internal IDs are stripped from all context feeds before processing.
3. **Tenant Boundaries**: Conversations, message loops, audits, and recommendations are strictly scoped by organization boundaries to ensure strong multi-tenant security isolation.

---

## 2. Database Schema Definition

Two new tables were added to the schema to support multi-turn conversation memory:

```prisma
model Conversation {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String?   @db.Uuid
  auditId        String    @db.Uuid
  title          String
  isPinned       Boolean   @default(false)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  // Relationships
  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  audit        Audit         @relation(fields: [auditId], references: [id], onDelete: Cascade)
  messages     Message[]

  @@index([organizationId])
  @@index([auditId])
  @@index([deletedAt])
}

model Message {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversationId String       @db.Uuid
  sender         String       // "USER" | "COPILOT"
  content        String
  createdAt      DateTime     @now()

  // Relationships
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}
```

---

## 3. High-Fidelity Copilot Core Services

The business intelligence architecture is split across five modular subservices:

### 1. `AuditContextBuilder`
Constructs a token-efficient, highly descriptive text context of the selected `Audit` object.
- Extracts health metrics, subscores, benchmarks, active recommendations, and tools inventory.
- Strips PII, security API keys, private system credentials, and organization email lists.

### 2. `ConversationService`
Coordinates the chat state.
- Automatically caches fetched conversations and messages in Upstash Redis using a 24-hour TTL (`86,400` seconds).
- Handles Redis offline state gracefully by falling back to querying the database directly.
- Validates organization ownership during cache retrieves and DB lookups.

### 3. `AuditCopilotService`
Orchestrates the chat loops.
- Concatenates the last 10 messages of the chat history to fit inside LLM context sizes.
- Passes system instructions enforcing the read-only mandate and math restriction.
- Calls the `GroqProvider` using model `llama-3.3-70b-versatile` with JSON-mode structure parsing.

### 4. `ActionPlanService`
Generates a structured, 30-day week-by-week implementation plan.
- Leverages Llama 3.3 native JSON output format to retrieve an array of `weeks`, goals, priorities, and steps.

### 5. `RecommendationCopilotService` & `ExecutiveAdvisorService`
Provide deep-dives for individual recommendations and board-ready executive comparison metrics.

---

## 4. API Endpoints

All API route handlers under `/api/copilot/` enforce session scoping and strict tenant isolation:

- **`POST /api/copilot/chat`**: Generates replies to multi-turn conversation questions.
- **`GET/POST /api/copilot/conversations`**: Lists previous chat threads or starts a new session.
- **`GET/PATCH/DELETE /api/copilot/conversations/[id]`**: Fetches, pins, or soft-deletes a conversation.
- **`POST /api/copilot/action-plan`**: Compiles the 30-day weekly action steps.
- **`POST /api/copilot/deep-dive`**: Retrieves risk mitigation checklists for high-cost recommendations.
- **`POST /api/copilot/executive`**: Renders board briefs comparing stance metrics against peers.

---

## 5. UI & UX Components

The interface delivers a premium, highly responsive user experience:

1. **Floating Chat Drawer**: Embedded on the main Audit Results page. Opens immediately to allow in-context conversations while looking at visual charts.
2. **Interactive Suggestion Chips**: Macros that fetch structured deep dives, action plans, or board reviews and insert them as rich UI blocks directly in the messaging thread.
3. **Full-Screen Workspace**: A dedicated dashboard featuring session history, pin filters, text search, sidebar collapse toggles, and typing indicators.
4. **Keyboard Shortcuts**:
   - `Cmd + K`: Focuses sidebar search.
   - `Cmd + /`: Collapses or expands the session history sidebar.

---

## 6. Observability & Telemetry

- **Sentry Integration**: Exceptions inside route execution or Groq JSON schema parsing are logged to Sentry.
- **PostHog Integration**: Events (`copilot_message_sent`, `copilot_response_failed`, `copilot_action_plan_generated`, `copilot_deep_dive_generated`) track execution latencies and token count telemetry metrics.
