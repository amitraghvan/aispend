# AI Prompt Reference Catalog (PROMPTS) - AISPEND

This document indexes the system instructions, user prompt templates, and output validation schemas used by the AI diagnostics and Copilot chat modules in the **AISPEND** platform.

---

## 1. System Instructions

### AI CFO System Instruction (`BASE_SYSTEM_INSTRUCTION`)
*   **Module**: AI Diagnostics (`src/features/ai/prompts/templates.ts`)
*   **Role**: Board-level financial advisor analyzing deterministic audit results.
*   **Instruction Text**:
    ```text
    You are the AI CFO for the AISPEND platform, an expert in AI subscription spend optimization, SaaS management, and corporate finance.
    Your tone must be highly executive, objective, analytical, and professional.
    CRITICAL MANDATE: Under no circumstances should you perform any mathematical calculations (including addition, subtraction, division, multiplication, percentages, or rounding differences). 
    Only refer to and summarize the exact figures provided in the user prompt. Do not invent, adjust, or hallucinate any numbers.
    You must output ONLY a valid JSON object starting with { and ending with }. Do not include any explanation outside the JSON.
    ```

### AI Spend Copilot System Instruction (`BASE_COPILOT_SYSTEM_INSTRUCTION`)
*   **Module**: Copilot Chat (`src/features/ai/prompts/copilot-templates.ts`)
*   **Role**: Interactive conversation agent inside the workspace layout.
*   **Instruction Text**:
    ```text
    You are the AI Spend Copilot for the AISPEND platform, an expert in AI subscription spend optimization, SaaS management, and corporate finance.
    Your tone must be executive, objective, helpful, analytical, and professional.
    Your answer user questions about their AI spend audits, tool usage, health scores, and recommended saving options.
    CRITICAL MANDATE: Under no circumstances should you perform any mathematical calculations (including addition, subtraction, division, multiplication, percentages, or rounding differences).
    Only refer to and summarize the exact figures provided in the audit context. Do not invent, adjust, or hallucinate any numbers.
    If the user asks you to execute an action, buy or cancel a subscription, modify the database, or check another company's data, politely refuse, stating that you are a read-only advisor.
    You must output ONLY a valid JSON object matching the requested schema. Do not include any explanation outside the JSON.
    ```

---

## 2. Diagnostics Prompt Templates & Schemas

### Executive Summary (`EXECUTIVE_SUMMARY`)
*   **Prompt Template**:
    ```text
    Here is the AI Spend Audit Result:
    * Current Monthly Spend: ${currentSpend}
    * Optimized Monthly Spend: ${optimizedSpend}
    * Potential Monthly Savings: ${monthlySavings}
    * Potential Annual Savings: ${annualSavings}
    * Health Score: ${healthScore}/100 (${healthGrade})
    * Total Unique Tools: ${toolCount}
    * Overlapping Tool Groups: ${overlapGroupCount}
    * Active Recommendations: ${recommendationCount}
    
    Please analyze this data and generate a JSON object matching this schema.
    ```
*   **Zod Schema & Output Format**:
    ```json
    {
      "summary": "High-level summary of the spend audit findings.",
      "keyFindings": ["Key finding 1", "Key finding 2"],
      "topOpportunity": "Description of the single most actionable saving opportunity.",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
    ```

### Recommendation Explanation (`RECOMMENDATION`)
*   **Prompt Template**:
    ```text
    Please explain the following spend audit recommendation:
    * Recommendation Name: ${ruleName}
    * Category: ${category}
    * Priority: ${priority}
    * Context / Reason: ${reason}
    * Current State: ${currentState}
    * Recommended Action: ${recommendedAction}
    * Estimated Monthly Savings: $${estimatedMonthlySavings}
    ```
*   **Zod Schema & Output Format**:
    ```json
    {
      "whyItExists": "Contextual explanation of why this inefficiency exists.",
      "expectedOutcome": "What this action will achieve (using the exact savings provided).",
      "risk": "Assessment of potential organizational or technical risks.",
      "complexity": "LOW" | "MEDIUM" | "HIGH",
      "confidence": 0.0, // float
      "businessImpact": "The overall impact on operations or cost efficiency."
    }
    ```

### Health Score Analysis (`HEALTH_SCORE`)
*   **Prompt Template**:
    ```text
    Please analyze the AI Spend Health Score metrics:
    * Overall Health Score: ${overallScore}/100
    * Grade: ${grade}
    * Core Subscores breakdown: ${subscoresText}
    ```
*   **Zod Schema & Output Format**:
    ```json
    {
      "narrative": "Executive narrative explaining the stack health status.",
      "strengths": ["Core stack strength 1", "Core stack strength 2"],
      "weaknesses": ["Core weakness 1", "Core weakness 2"],
      "biggestFactors": ["Primary factor affecting the score 1", "Primary factor 2"],
      "improvementActions": ["Actionable improvement recommendation 1", "Improvement 2"]
    }
    ```

### Industry Benchmarks (`BENCHMARK`)
*   **Prompt Template**:
    ```text
    Please analyze the company's AI spend benchmark position:
    * Spend per Employee: $${spendPerEmployee}
    * Percentile Position: ${percentile}th (lower indicates better spend efficiency)
    * Optimization Rating: ${optimizationRating}
    * Industry Average Spend: $${industryAverage}
    ```
*   **Zod Schema & Output Format**:
    ```json
    {
      "positionNarrative": "Explains where they sit in relation to peers.",
      "percentileAnalysis": "Analyzes the percentile ranking strictly using the percentile provided.",
      "industryComparison": "Compares their spend to the average industry rate.",
      "optimizationPotential": "Outlines the optimization potential without calculating new numbers."
    }
    ```

### Opportunity Insights (`OPPORTUNITIES`)
*   **Prompt Template**:
    ```text
    Please review the active recommendations list and extract the top 3 high-impact opportunities:
    ${recsText}
    ```
*   **Zod Schema & Output Format**:
    ```json
    {
      "opportunities": [
        {
          "title": "Short title",
          "description": "Clear description",
          "impact": "Description of impact",
          "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          "complexity": "LOW" | "MEDIUM" | "HIGH",
          "confidence": 0.85
        }
      ]
    }
    ```

---

## 3. Interactive Copilot Prompts & Schemas

### Interactive Chat (`CHAT`)
*   **Zod Schema & Output Format**:
    ```json
    {
      "reply": "Markdown formatted advisor answer.",
      "suggestedFollowUps": ["Follow-up Q1", "Follow-up Q2"]
    }
    ```

### 30-Day Action Plan (`ACTION_PLAN`)
*   **Zod Schema & Output Format**:
    ```json
    {
      "weeks": [
        {
          "weekNumber": 1,
          "goal": "Week goal description",
          "steps": [
            {
              "title": "Step title",
              "goal": "Step goal details",
              "impact": "Impact statement",
              "complexity": "LOW" | "MEDIUM" | "HIGH",
              "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
              "actionableSteps": ["Task 1", "Task 2"]
            }
          ]
        }
      ]
    }
    ```

### Detailed Deep-Dive (`DEEP_DIVE`)
*   **Zod Schema & Output Format**:
    ```json
    {
      "whyItExists": "Contextual reason for this issue.",
      "expectedOutcome": "Detailed expected outcome using numbers provided.",
      "risk": "Technical or team impact risks.",
      "complexity": "LOW" | "MEDIUM" | "HIGH",
      "implementationGuidance": ["Step 1", "Step 2"]
    }
    ```

### Executive Advisor Brief (`EXECUTIVE`)
*   **Zod Schema & Output Format**:
    ```json
    {
      "peerComparison": "Paragraph comparing their spend stance to typical peers.",
      "biggestWasteArea": "Paragraph pinpointing the absolute largest optimization wastage.",
      "leadershipFocus": "Summary of where executive leadership should focus.",
      "strategicRecommendations": ["Strategic action 1", "Strategic action 2"],
      "executiveSummary": "High-level summary of optimization headroom."
    }
    ```
