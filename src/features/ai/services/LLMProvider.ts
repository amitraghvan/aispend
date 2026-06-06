import { z } from 'zod';

export interface LLMProvider {
  generateStructuredJSON<T>(
    systemInstruction: string,
    prompt: string,
    schema: z.ZodType<T>,
    timeoutMs?: number
  ): Promise<T>;
}
