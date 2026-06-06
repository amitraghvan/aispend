import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pgPool: pg.Pool;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return createDeferredProxy() as PrismaClient;
  }

  try {
    // Reuse pool in development to prevent connection leakage on hot reload
    let pool = globalForPrisma.pgPool;
    if (!pool) {
      pool = new pg.Pool({ connectionString });
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.pgPool = pool;
      }
    }

    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.warn('Failed to initialize Prisma Client, falling back to deferred proxy:', error);
    return createDeferredProxy() as PrismaClient;
  }
}

function createDeferredProxy(): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === '$connect' || prop === '$disconnect') return () => Promise.resolve();
        if (prop === '$transaction') {
          return (cb: unknown) => {
            if (typeof cb === 'function') return cb(createDeferredProxy());
            return Promise.all(cb as Promise<unknown>[]);
          };
        }
        return (..._args: unknown[]) => {
          throw new Error('Database not available. Ensure DATABASE_URL is configured.');
        };
      },
    }
  );
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
