import { PrismaClient } from "@prisma/client";

// Global Prisma caching untuk mencegah multiple instance di Next.js (dev mode)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Simpan di globalThis supaya tidak buat instance baru setiap hot-reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
