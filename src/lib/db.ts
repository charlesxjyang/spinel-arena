/**
 * Prisma client singleton for Next.js.
 *
 * Lazily initialized to avoid errors during build (when DATABASE_URL
 * is not available). In development, the instance is cached on
 * `globalThis` to prevent connection exhaustion from hot reloads.
 *
 * Returns null if DATABASE_URL is not set, allowing the app to run
 * without a database (persistence is skipped).
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
