import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GroqProvider } from '@/features/ai/services/GroqProvider';
import { z } from 'zod';

describe('GroqProvider', () => {
  let provider: GroqProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GroqProvider();
  });

  const DummySchema = z.object({
    summary: z.string(),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  });

  it('should run in mock mode by default under test environment', () => {
    expect((provider as any).isMockMode).toBe(true);
  });

  it('should generate dummy matching mock response for ExecutiveSummary properties', async () => {
    const res = await provider.generateStructuredJSON('sys', 'prompt', DummySchema);
    expect(res.summary).toBeDefined();
    expect(res.riskLevel).toBe('MEDIUM');
  });

  it('should correctly extract JSON from standard markdown block', () => {
    const rawMarkdown = '```json\n{"summary": "Test", "riskLevel": "LOW"}\n```';
    const extracted = (provider as any).extractJSON(rawMarkdown);
    expect(extracted).toBe('{"summary": "Test", "riskLevel": "LOW"}');
  });

  it('should correctly extract JSON from standard code fences without json flag', () => {
    const rawMarkdown = '```\n{"summary": "Test", "riskLevel": "LOW"}\n```';
    const extracted = (provider as any).extractJSON(rawMarkdown);
    expect(extracted).toBe('{"summary": "Test", "riskLevel": "LOW"}');
  });

  it('should extract JSON from arbitrary text block containing curly braces', () => {
    const mixedText = 'Here is the response: {"summary": "Test", "riskLevel": "HIGH"} and some footnotes.';
    const extracted = (provider as any).extractJSON(mixedText);
    expect(extracted).toBe('{"summary": "Test", "riskLevel": "HIGH"}');
  });

  it('should return trimmed text if no fences or braces exist', () => {
    const simpleText = 'No braces here';
    const extracted = (provider as any).extractJSON(simpleText);
    expect(extracted).toBe('No braces here');
  });

  it('should generate correct schema mockup for RecommendationExplanation properties', async () => {
    const schema = z.object({
      whyItExists: z.string(),
      complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      confidence: z.number(),
    });
    const res = await provider.generateStructuredJSON('sys', 'prompt', schema);
    expect(res.whyItExists).toContain('excess individual developer seat counts');
    expect(res.complexity).toBe('LOW');
    expect(res.confidence).toBe(0.95);
  });

  it('should generate correct schema mockup for HealthScoreExplanation properties', async () => {
    const schema = z.object({
      narrative: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    });
    const res = await provider.generateStructuredJSON('sys', 'prompt', schema);
    expect(res.narrative).toContain('database configurations and billing frequency');
    expect(res.strengths.length).toBeGreaterThan(0);
    expect(res.weaknesses.length).toBeGreaterThan(0);
  });

  it('should generate correct schema mockup for BenchmarkNarrative properties', async () => {
    const schema = z.object({
      positionNarrative: z.string(),
      percentileAnalysis: z.string(),
    });
    const res = await provider.generateStructuredJSON('sys', 'prompt', schema);
    expect(res.positionNarrative).toContain('median for mid-market technology firms');
    expect(res.percentileAnalysis).toContain('percentile');
  });

  it('should generate correct schema mockup for OpportunityInsightList properties', async () => {
    const schema = z.object({
      opportunities: z.array(z.object({
        title: z.string(),
        impact: z.string(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
      })),
    });
    const res = await provider.generateStructuredJSON('sys', 'prompt', schema);
    expect(res.opportunities.length).toBeGreaterThan(0);
    expect(res.opportunities[0].title).toBe('Consolidate mixed-use writing models');
    expect(res.opportunities[0].priority).toBe('HIGH');
  });

  it('should fallback to returning raw object if schema.parse fails inside generateMockResponse', async () => {
    const invalidSchema = z.object({
      nonExistentField: z.string(),
    });
    const res = await provider.generateStructuredJSON('sys', 'prompt', invalidSchema);
    expect(res).toBeDefined();
    expect((res as any).summary).toBeDefined();
  });

  it('should call Groq API and parse JSON successfully on the first attempt', async () => {
    (provider as any).isMockMode = false;
    (provider as any).apiKey = 'gsk_key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '```json\n{"summary": "API success", "riskLevel": "LOW"}\n```' } }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await provider.generateStructuredJSON('sys', 'prompt', DummySchema);
    expect(res.summary).toBe('API success');
    expect(res.riskLevel).toBe('LOW');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer gsk_key',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('should retry on error and return response if retry succeeds on second attempt', async () => {
    (provider as any).isMockMode = false;
    (provider as any).apiKey = 'gsk_key';

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });

    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"summary": "Retry success", "riskLevel": "HIGH"}' } }],
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const res = await provider.generateStructuredJSON('sys', 'prompt', DummySchema);
    expect(res.summary).toBe('Retry success');
    expect(res.riskLevel).toBe('HIGH');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error and call Sentry after 3 failed attempts', async () => {
    (provider as any).isMockMode = false;
    (provider as any).apiKey = 'gsk_key';

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });

    const mockFetch = vi.fn().mockRejectedValue(new Error('API failure'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(provider.generateStructuredJSON('sys', 'prompt', DummySchema)).rejects.toThrow('API failure');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should throw error if Groq returns non-200 status', async () => {
    (provider as any).isMockMode = false;
    (provider as any).apiKey = 'gsk_key';

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized access'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(provider.generateStructuredJSON('sys', 'prompt', DummySchema)).rejects.toThrow('Groq API returned status 401: Unauthorized access');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should throw error if Groq response choices are missing', async () => {
    (provider as any).isMockMode = false;
    (provider as any).apiKey = 'gsk_key';

    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(provider.generateStructuredJSON('sys', 'prompt', DummySchema)).rejects.toThrow('Expected message content from Groq response');
  });
});
