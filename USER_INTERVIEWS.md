# User Interviews & Qualitative Feedback (USER_INTERVIEWS) - AISPEND

This document compiles three simulated user interviews representing our core startup customer personas. These conversations directly influenced the features, rules, and security boundaries implemented in the **AISPEND** engine.

---

## Interview 1: CTO of a Seed-Stage Development Shop

*   **Profile**: Dev shop with 12 engineers.
*   **AI Monthly Spend**: $600
*   **Key Pain Point**: Developer assistant tool sprawl.

### Summary Transcript
> *"We let devs choose their own tooling. When I ran the audit, I realized we had 6 developers using Cursor Pro ($20/mo) who also had active GitHub Copilot Business seats ($19/mo) because it's part of our org-wide GitHub package. That's a direct, redundant overlap. We're paying double for the same autocomplete utility."*

### Impact on Product Rules
This interview drove the creation of rule **OV-006 (Cursor + Copilot overlap)** and rule **OV-011 (Triple AI assistant overlap)**. It highlighted the need to flag when an organization pays for both inline IDE assistants and generic chat subscriptions for the same user seats, resulting in aggressive health score deductions (Letter Grade F) for multi-tool setups.

---

## Interview 2: VP of Finance at a Scale-Up Startup

*   **Profile**: B2B SaaS startup with 85 employees.
*   **AI Monthly Spend**: $4,500
*   **Key Pain Point**: Redundant general-purpose chat seats and lack of visibility.

### Summary Transcript
> *"Ramp alerts us when SaaS spend spikes, but it doesn't tell us if employees are buying ChatGPT Plus on corporate cards while we have a central Claude Team workspace active. I found out our marketing team is split: half use Claude Projects, and the other half are expensing ChatGPT Plus. Plus, we're paying for 10 empty seats in our Claude Team workspace because employee offboarding is messy. I need a single report I can hand to our board showing we're optimizing AI operational costs."*

### Impact on Product Rules
This conversation directly inspired the **Seat Utilization subscore (20% weight)** and rule **PD-013 (Claude Team excess seats)**. It also established the requirement for the **AI Spend Copilot Executive brief** (`EXECUTIVE` prompt) to format output as a "board-level strategic narrative" comparing company metrics directly with industry benchmarks.

---

## Interview 3: Head of Operations at a General Tech Startup

*   **Profile**: 40 employees.
*   **AI Monthly Spend**: $2,200
*   **Key Pain Point**: Security boundaries and convenience.

### Summary Transcript
> *"I'm responsible for optimizing our tools, but I don't have the time to manually check every employee's Slack thread. Also, our developers are terrified about security — they don't want us uploading their codebase or API keys. If your tool requires database access or code parsing, our security team will reject it instantly."*

### Impact on Product Rules
This interview drove two critical design guidelines:
1.  **Context Pruning**: The context builder (`src/features/ai/services/AuditContextBuilder.ts`) must strip all API keys, database credentials, and user PII before generating LLM summaries.
2.  **Read-Only Boundary**: The Copilot must refuse any database modification command or action to remain a strictly advisory dashboard utility.
