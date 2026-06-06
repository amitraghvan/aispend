import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid connection string URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY cannot be empty'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY cannot be empty'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY cannot be empty'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY cannot be empty'),
  UPSTASH_REDIS_URL: z.string().url('UPSTASH_REDIS_URL must be a valid URL'),
  UPSTASH_REDIS_TOKEN: z.string().min(1, 'UPSTASH_REDIS_TOKEN cannot be empty'),
  POSTHOG_KEY: z.string().min(1, 'POSTHOG_KEY cannot be empty'),
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Lenient schema used when strict env vars are not configured.
 * All fields are optional with safe defaults so the app can boot for
 * local development and build-time without a full .env file.
 */
const lenientSchema = z.object({
  DATABASE_URL: z.string().optional().default(''),
  DIRECT_URL: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('http://localhost:3000'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  UPSTASH_REDIS_URL: z.string().optional().default(''),
  UPSTASH_REDIS_TOKEN: z.string().optional().default(''),
  POSTHOG_KEY: z.string().optional().default(''),
  SENTRY_DSN: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parseEnv = () => {
  // First try strict validation
  const strict = envSchema.safeParse(process.env);

  if (strict.success) {
    return strict.data;
  }

  // In production, strict validation is required
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.error('❌ Invalid Environment Configuration:');
    const formattedErrors = strict.error.format();
    for (const [key, value] of Object.entries(formattedErrors)) {
      if (key !== '_errors') {
        const errors = (value as { _errors: string[] })._errors;
        console.error(`  - ${key}: ${errors.join(', ')}`);
      }
    }
    throw new Error('Invalid environment configuration. See logs above.');
  }

  // In dev/build/test, fall back to lenient defaults and warn
  if (typeof globalThis !== 'undefined' && !(globalThis as unknown as Record<string, boolean>).__envWarned) {
    console.warn('⚠️  Some environment variables are missing. Using lenient defaults for development.');
    (globalThis as unknown as Record<string, boolean>).__envWarned = true;
  }

  return lenientSchema.parse(process.env);
};

export const env = parseEnv();
export type EnvType = z.infer<typeof envSchema>;
