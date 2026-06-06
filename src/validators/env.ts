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

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid Environment Configuration:');
    const formattedErrors = result.error.format();
    for (const [key, value] of Object.entries(formattedErrors)) {
      if (key !== '_errors') {
        const errors = (value as { _errors: string[] })._errors;
        console.error(`  - ${key}: ${errors.join(', ')}`);
      }
    }
    
    if (typeof window === 'undefined') {
      console.error('Shutting down server due to invalid configuration.');
      if (typeof process !== 'undefined' && typeof process.exit === 'function') {
        process.exit(1);
      } else {
        throw new Error('Shutting down server due to invalid configuration.');
      }
    } else {
      throw new Error(`Invalid environment variables: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
    }
  }

  return result.data;
};

export const env = parseEnv();
export type EnvType = z.infer<typeof envSchema>;
