/**
 * AI Tool Catalog — Production Data
 *
 * Contains verified pricing for all supported AI tools.
 * Prices are per-seat, per-month in USD.
 * Last verified: 2025-06 pricing pages.
 */

import { ToolCatalogEntry, ToolCatalogMap } from '../types';

const catalogEntries: ToolCatalogEntry[] = [
  // ─────────────────────────────────────────────
  // CURSOR
  // ─────────────────────────────────────────────
  {
    toolId: 'cursor',
    toolName: 'Cursor',
    vendor: 'Cursor',
    category: 'coding',
    plans: [
      {
        planId: 'cursor-free',
        planName: 'Hobby',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['2000 completions', '50 slow premium requests'],
      },
      {
        planId: 'cursor-pro',
        planName: 'Pro',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: 192,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Unlimited completions', '500 fast premium requests', 'Unlimited slow premium requests'],
      },
      {
        planId: 'cursor-business',
        planName: 'Business',
        monthlyPricePerSeat: 40,
        annualPricePerSeat: 384,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Everything in Pro', 'Admin dashboard', 'SAML SSO', 'Usage analytics', 'Enforce privacy mode'],
      },
    ],
    targetUsers: ['developers', 'engineering teams'],
    useCases: ['coding'],
    pricingSource: 'https://www.cursor.com/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['github-copilot', 'windsurf'],
  },

  // ─────────────────────────────────────────────
  // GITHUB COPILOT
  // ─────────────────────────────────────────────
  {
    toolId: 'github-copilot',
    toolName: 'GitHub Copilot',
    vendor: 'GitHub',
    category: 'coding',
    plans: [
      {
        planId: 'copilot-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['2000 code completions/mo', '50 chat messages/mo'],
      },
      {
        planId: 'copilot-pro',
        planName: 'Pro',
        monthlyPricePerSeat: 10,
        annualPricePerSeat: 100,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Unlimited completions', 'Unlimited chat', 'Multiple model access'],
      },
      {
        planId: 'copilot-pro-plus',
        planName: 'Pro+',
        monthlyPricePerSeat: 39,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Everything in Pro', 'Unlimited agent mode', 'Access to latest models'],
      },
      {
        planId: 'copilot-business',
        planName: 'Business',
        monthlyPricePerSeat: 19,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Organization-wide policies', 'Audit logs', 'IP indemnity', 'Exclude files'],
      },
      {
        planId: 'copilot-enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: 39,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Everything in Business', 'Knowledge bases', 'Fine-tuned models', 'Custom policies'],
      },
    ],
    targetUsers: ['developers', 'engineering teams'],
    useCases: ['coding'],
    pricingSource: 'https://github.com/features/copilot',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['cursor', 'windsurf'],
  },

  // ─────────────────────────────────────────────
  // CHATGPT (OpenAI Consumer)
  // ─────────────────────────────────────────────
  {
    toolId: 'chatgpt',
    toolName: 'ChatGPT',
    vendor: 'OpenAI',
    category: 'mixed',
    plans: [
      {
        planId: 'chatgpt-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['GPT-4o mini', 'Limited GPT-4o', 'Basic web browsing'],
      },
      {
        planId: 'chatgpt-plus',
        planName: 'Plus',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['GPT-4o', 'Advanced data analysis', 'DALL-E', 'Web browsing', 'Custom GPTs'],
      },
      {
        planId: 'chatgpt-pro',
        planName: 'Pro',
        monthlyPricePerSeat: 200,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Unlimited access to all models', 'o1 pro mode', 'Extended thinking'],
      },
      {
        planId: 'chatgpt-team',
        planName: 'Team',
        monthlyPricePerSeat: 25,
        annualPricePerSeat: 300,
        seatMinimum: 2,
        seatMaximum: null,
        features: ['Everything in Plus', 'Shared workspace', 'Admin console', 'Data excluded from training'],
      },
      {
        planId: 'chatgpt-enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: 60,
        annualPricePerSeat: null,
        seatMinimum: 50,
        seatMaximum: null,
        features: ['Everything in Team', 'SAML SSO', 'Custom data retention', 'Priority support', 'Admin analytics'],
      },
    ],
    targetUsers: ['all employees', 'writers', 'researchers', 'developers'],
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingSource: 'https://openai.com/chatgpt/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['claude', 'gemini'],
  },

  // ─────────────────────────────────────────────
  // CLAUDE (Anthropic Consumer)
  // ─────────────────────────────────────────────
  {
    toolId: 'claude',
    toolName: 'Claude',
    vendor: 'Anthropic',
    category: 'mixed',
    plans: [
      {
        planId: 'claude-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Basic usage of Claude', 'Limited messages'],
      },
      {
        planId: 'claude-pro',
        planName: 'Pro',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['5x more usage', 'Priority access', 'Claude 3.5 Sonnet', 'Projects'],
      },
      {
        planId: 'claude-team',
        planName: 'Team',
        monthlyPricePerSeat: 25,
        annualPricePerSeat: 300,
        seatMinimum: 5,
        seatMaximum: null,
        features: ['Everything in Pro', 'Team collaboration', 'Admin dashboard', 'Higher limits'],
      },
      {
        planId: 'claude-enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: 60,
        annualPricePerSeat: null,
        seatMinimum: 50,
        seatMaximum: null,
        features: ['Everything in Team', 'SSO/SCIM', 'Audit logs', 'Custom retention', 'Dedicated support'],
      },
    ],
    targetUsers: ['all employees', 'writers', 'researchers', 'developers'],
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingSource: 'https://claude.ai/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['chatgpt', 'gemini'],
  },

  // ─────────────────────────────────────────────
  // GEMINI (Google Consumer)
  // ─────────────────────────────────────────────
  {
    toolId: 'gemini',
    toolName: 'Gemini',
    vendor: 'Google',
    category: 'mixed',
    plans: [
      {
        planId: 'gemini-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Gemini 1.5 Flash', 'Basic features'],
      },
      {
        planId: 'gemini-advanced',
        planName: 'Advanced',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Gemini Ultra', '2TB Google storage', 'Advanced features', 'Google One AI Premium'],
      },
      {
        planId: 'gemini-business',
        planName: 'Business',
        monthlyPricePerSeat: 24,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Gemini for Google Workspace', 'Enterprise security', 'Admin controls'],
      },
      {
        planId: 'gemini-enterprise',
        planName: 'Enterprise',
        monthlyPricePerSeat: 36,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Everything in Business', 'Advanced security', 'Custom models', 'Grounding with search'],
      },
    ],
    targetUsers: ['all employees', 'writers', 'researchers'],
    useCases: ['writing', 'research', 'data', 'mixed'],
    pricingSource: 'https://one.google.com/about/ai-premium',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['chatgpt', 'claude'],
  },

  // ─────────────────────────────────────────────
  // ANTHROPIC API
  // ─────────────────────────────────────────────
  {
    toolId: 'anthropic-api',
    toolName: 'Anthropic API',
    vendor: 'Anthropic',
    category: 'mixed',
    plans: [
      {
        planId: 'anthropic-api-payg',
        planName: 'Pay-as-you-go',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Usage-based pricing', 'All Claude models', 'API access'],
      },
    ],
    targetUsers: ['developers', 'engineering teams'],
    useCases: ['coding', 'writing', 'research', 'data', 'mixed'],
    pricingSource: 'https://www.anthropic.com/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['openai-api'],
  },

  // ─────────────────────────────────────────────
  // OPENAI API
  // ─────────────────────────────────────────────
  {
    toolId: 'openai-api',
    toolName: 'OpenAI API',
    vendor: 'OpenAI',
    category: 'mixed',
    plans: [
      {
        planId: 'openai-api-payg',
        planName: 'Pay-as-you-go',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: null,
        features: ['Usage-based pricing', 'All GPT models', 'API access', 'Fine-tuning'],
      },
    ],
    targetUsers: ['developers', 'engineering teams'],
    useCases: ['coding', 'writing', 'research', 'data', 'mixed'],
    pricingSource: 'https://openai.com/api/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['anthropic-api'],
  },

  // ─────────────────────────────────────────────
  // WINDSURF (Codeium)
  // ─────────────────────────────────────────────
  {
    toolId: 'windsurf',
    toolName: 'Windsurf',
    vendor: 'Codeium',
    category: 'coding',
    plans: [
      {
        planId: 'windsurf-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Basic autocomplete', 'Limited premium model access'],
      },
      {
        planId: 'windsurf-pro',
        planName: 'Pro',
        monthlyPricePerSeat: 15,
        annualPricePerSeat: 120,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Unlimited completions', 'Premium model access', 'Cascade agentic flows'],
      },
      {
        planId: 'windsurf-team',
        planName: 'Team',
        monthlyPricePerSeat: 35,
        annualPricePerSeat: null,
        seatMinimum: 2,
        seatMaximum: null,
        features: ['Everything in Pro', 'Admin controls', 'Usage analytics', 'Team management'],
      },
    ],
    targetUsers: ['developers', 'engineering teams'],
    useCases: ['coding'],
    pricingSource: 'https://windsurf.com/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['cursor', 'github-copilot'],
  },

  // ─────────────────────────────────────────────
  // V0 (Vercel)
  // ─────────────────────────────────────────────
  {
    toolId: 'v0',
    toolName: 'v0',
    vendor: 'Vercel',
    category: 'coding',
    plans: [
      {
        planId: 'v0-free',
        planName: 'Free',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['200 credits/mo', 'Basic generation'],
      },
      {
        planId: 'v0-premium',
        planName: 'Premium',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: null,
        seatMinimum: 1,
        seatMaximum: 1,
        features: ['Unlimited credits', 'Priority access', 'Advanced generation', 'Private projects'],
      },
      {
        planId: 'v0-team',
        planName: 'Team',
        monthlyPricePerSeat: 30,
        annualPricePerSeat: null,
        seatMinimum: 2,
        seatMaximum: null,
        features: ['Everything in Premium', 'Team workspace', 'Admin controls'],
      },
    ],
    targetUsers: ['frontend developers', 'designers'],
    useCases: ['coding'],
    pricingSource: 'https://v0.dev/pricing',
    pricingVerifiedAt: '2025-06-01',
    alternativeToolIds: ['cursor', 'windsurf'],
  },
];

// Build the map keyed by toolId for O(1) lookups
const catalog: ToolCatalogMap = {};
for (const entry of catalogEntries) {
  catalog[entry.toolId] = entry;
}

export const TOOL_CATALOG: ToolCatalogMap = Object.freeze(catalog) as ToolCatalogMap;
export const TOOL_LIST: readonly ToolCatalogEntry[] = Object.freeze(catalogEntries);
export const SUPPORTED_TOOL_IDS = Object.freeze(catalogEntries.map((e) => e.toolId));
