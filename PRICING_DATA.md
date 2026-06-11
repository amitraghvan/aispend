# AI Tool Pricing Reference Catalog (PRICING_DATA) - AISPEND

This document serves as a detailed reference catalog for verified pricing, feature limits, and alternative tools supported by the **AISPEND** engine. All prices are in USD, and constraints are checked programmatically by the `PricingService` and `RuleEngine`.

**Last verified**: 2025-06-01

---

## 1. Supported AI Tools Catalog

### Cursor (Vendor: Cursor)
*   **Category**: Coding
*   **Use Cases**: Code completion, AI chats, agentic code edits.
*   **Alternative Tools**: `github-copilot`, `windsurf`
*   **Plans & Pricing**:
    *   **Hobby (Free)**: $0/seat/mo. Limits: 1 seat max, 2000 completions, 50 slow premium requests.
    *   **Pro**: $20/seat/mo ($192/seat/yr billed annually). Limits: 1 seat max, unlimited completions, 500 fast premium requests.
    *   **Business**: $40/seat/mo ($384/seat/yr billed annually). Limits: min 1 seat, admin dashboard, SAML SSO, usage analytics, enforced privacy mode.

### GitHub Copilot (Vendor: GitHub)
*   **Category**: Coding
*   **Use Cases**: Code completion, CLI assistant, workspace chat.
*   **Alternative Tools**: `cursor`, `windsurf`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, 2000 completions/mo, 50 chat messages/mo.
    *   **Pro**: $10/seat/mo ($100/seat/yr billed annually). Limits: 1 seat max, unlimited completions/chat, multi-model access.
    *   **Pro+**: $39/seat/mo. Limits: 1 seat max, unlimited agent mode, latest model access.
    *   **Business**: $19/seat/mo. Limits: min 1 seat, organization policies, audit logs, IP indemnity, file exclusion rules.
    *   **Enterprise**: $39/seat/mo. Limits: min 1 seat, custom knowledge bases, fine-tuned models, custom policies.

### ChatGPT (Vendor: OpenAI)
*   **Category**: Mixed (General Purpose)
*   **Use Cases**: Writing, research, coding, data analysis, custom GPTs.
*   **Alternative Tools**: `claude`, `gemini`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, GPT-4o mini access, limited GPT-4o, basic web browsing.
    *   **Plus**: $20/seat/mo. Limits: 1 seat max, advanced data analysis, DALL-E, custom GPTs.
    *   **Pro**: $200/seat/mo. Limits: 1 seat max, unlimited access to all models, o1 pro mode, extended thinking.
    *   **Team**: $25/seat/mo ($300/seat/yr billed annually). Limits: min 2 seats, shared workspace, admin console, data excluded from training.
    *   **Enterprise**: $60/seat/mo. Limits: min 50 seats, SSO/SCIM, custom retention, priority support, admin analytics.

### Claude (Vendor: Anthropic)
*   **Category**: Mixed (General Purpose)
*   **Use Cases**: Long-context reasoning, writing, research, coding, Claude Projects.
*   **Alternative Tools**: `chatgpt`, `gemini`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, basic usage of Claude, limited messages.
    *   **Pro**: $20/seat/mo. Limits: 1 seat max, 5x more usage, priority access, Claude 3.5 Sonnet, projects.
    *   **Team**: $25/seat/mo ($300/seat/yr billed annually). Limits: min 5 seats, team collaboration, admin dashboard, higher usage limits.
    *   **Enterprise**: $60/seat/mo. Limits: min 50 seats, SSO/SCIM, audit logs, custom retention, dedicated support.

### Gemini (Vendor: Google)
*   **Category**: Mixed (General Purpose)
*   **Use Cases**: Long-context parsing, search grounding, Google Workspace integrations.
*   **Alternative Tools**: `chatgpt`, `claude`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, Gemini 1.5 Flash access.
    *   **Advanced**: $20/seat/mo. Limits: 1 seat max, Gemini Ultra access, 2TB Google storage.
    *   **Business**: $24/seat/mo. Limits: min 1 seat, Gemini for Workspace, enterprise security, admin controls.
    *   **Enterprise**: $36/seat/mo. Limits: min 1 seat, custom models, search grounding.

### Windsurf (Vendor: Codeium)
*   **Category**: Coding
*   **Use Cases**: Cascade agentic flow coding, auto-completions, chat.
*   **Alternative Tools**: `cursor`, `github-copilot`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, basic completions, limited premium model requests.
    *   **Pro**: $15/seat/mo ($120/seat/yr billed annually). Limits: 1 seat max, unlimited completions, Cascade agentic flows.
    *   **Team**: $35/seat/mo. Limits: min 2 seats, admin controls, usage analytics.

### v0 (Vendor: Vercel)
*   **Category**: Coding / Frontend UI
*   **Use Cases**: Frontend UI generation, React/Tailwind generation.
*   **Alternative Tools**: `cursor`, `windsurf`
*   **Plans & Pricing**:
    *   **Free**: $0/seat/mo. Limits: 1 seat max, 200 credits/mo, basic generation.
    *   **Premium**: $20/seat/mo. Limits: 1 seat max, unlimited credits, priority access, private projects.
    *   **Team**: $30/seat/mo. Limits: min 2 seats, team workspace, admin controls.

### OpenAI API & Anthropic API (Vendors: OpenAI / Anthropic)
*   **Category**: Mixed / Developer APIs
*   **Pricing**: Pay-as-you-go based on token usage. Listed at $0/seat base price in catalog.
*   **Alternatives**: Checked against each other for workload consolidation.

---

## 2. Constraints Checked by Pricing Service

*   **Seat Minimum Validations**: If an audit includes a team size that violates plan requirements (e.g. ChatGPT Enterprise with 10 users, where minimum is 50), the engine recommends downgrading or highlights billing inefficiency.
*   **Annual Savings Delta**: The engine compares the `monthlyPricePerSeat` and `annualPricePerSeat` values to calculate potential savings from switching to annual billing plans (e.g., Cursor Pro annual savings of $48/yr per seat).
