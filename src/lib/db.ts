import { PrismaClient } from "@prisma/client";

/**
 * Reuses one Prisma client during local hot reloads.
 *
 * Next.js development reloads modules frequently; without this singleton
 * pattern, each reload can create another database connection. Production
 * keeps the client module-scoped instead of storing it on globalThis.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
