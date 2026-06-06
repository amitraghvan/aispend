import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // During build time, DATABASE_URL may not be available.
  // Return a client that will fail on actual queries but won't crash on import.
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch {
    // Build-time: Prisma v7 "client" engine requires adapter/accelerateUrl.
    // Return a proxy that defers errors to actual query time.
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === '$connect' || prop === '$disconnect') return () => Promise.resolve();
        if (prop === '$transaction') {
          return (cb: unknown) => {
            if (typeof cb === 'function') return cb(createDeferredProxy());
            return Promise.all(cb as Promise<unknown>[]);
          };
        }
        return createDeferredProxy();
      },
    });
  }
}

function createDeferredProxy(): unknown {
  return new Proxy(
    {},
    {
      get() {
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
