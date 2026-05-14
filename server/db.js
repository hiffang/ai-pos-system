const { PrismaClient } = require("@prisma/client");

/** @type {import("@prisma/client").PrismaClient} */
let prisma;

/** @type {typeof globalThis & { prisma?: import("@prisma/client").PrismaClient }} */
const globalForPrisma = global;

try {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    // In development, use global to prevent multiple instances in hot reload
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient();
    }
    prisma = globalForPrisma.prisma;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[Prisma] Failed to initialize client.", message);
  throw error;
}

module.exports = prisma;
