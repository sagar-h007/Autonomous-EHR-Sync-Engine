// =============================================================================
// prisma.ts — Singleton Prisma Client
// =============================================================================
// PrismaClient opens a connection pool. Creating multiple instances during
// hot-reload (ts-node + nodemon) exhausts the DB connection limit.
// The global.__prisma guard is the official Prisma pattern to prevent this
// in development while being a no-op in production (single start).
// =============================================================================

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']  // verbose during dev for SQL introspection
        : ['warn', 'error'],          // minimal logging in production
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
