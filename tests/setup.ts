import { vi, beforeEach } from 'vitest';

// 1. Mock process.env BEFORE importing any other files
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/postgres?pgbouncer=true';
process.env.DIRECT_URL = 'postgresql://postgres:password@localhost:5432/postgres';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.SUPABASE_URL = 'https://mockref.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mockanon';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mockref.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mockanon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mockservice';
process.env.GROQ_API_KEY = 'gsk_mock';
process.env.RESEND_API_KEY = 're_mock';
process.env.UPSTASH_REDIS_URL = 'https://mockredis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'mocktoken';
process.env.POSTHOG_KEY = 'phc_mock';
process.env.SENTRY_DSN = 'https://mock@sentry.io/mock';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'test';

// 2. Mock Redis client
vi.mock('@/lib/redis/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    zrange: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn(() => ({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([0, 0, 0, 0]),
    })),
  },
  default: null,
}));

// 3. Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setExtras: vi.fn(),
    setTag: vi.fn(),
    setLevel: vi.fn(),
  })),
}));

// 4. Mock PostHog
vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: vi.fn(),
    identify: vi.fn(),
    shutdown: vi.fn(),
  })),
}));

// 5. Mock Prisma Client
const prismaMock = {
  audit: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  auditItem: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  },
  recommendation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  report: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  lead: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  auditShare: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  event: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  membership: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  invitation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  emailLog: {
    create: vi.fn(),
    update: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  message: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((callback: unknown) => {
    if (typeof callback === 'function') return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  }),
};

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

// 6. Mock global fetch to handle relative URLs in server/test environments
const mockFetch = vi.fn().mockImplementation((input: string | URL | Request) => {
  const urlStr = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
  
  if (urlStr.startsWith('/')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => {
        if (urlStr.includes('/api/team/members')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: {} });
      },
      headers: new Headers(),
    } as Response);
  }
  
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    headers: new Headers(),
  } as Response);
});

vi.stubGlobal('fetch', mockFetch);

export { prismaMock, mockFetch };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
});

