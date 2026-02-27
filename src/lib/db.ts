/**
 * Prisma client singleton for Next.js.
 *
 * In development, Next.js hot-reloads modules which would create new
 * PrismaClient instances on each reload, exhausting DB connections.
 * We store the instance on `globalThis` to reuse it across reloads.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
