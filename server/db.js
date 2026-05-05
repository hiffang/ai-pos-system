const { PrismaClient } = require("@prisma/client");

let prisma;

try {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    // In development, use global to prevent multiple instances in hot reload
    if (!global.prisma) {
      global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
  }
} catch (error) {
  console.error(
    "[Prisma] Failed to initialize client.",
    error.message
  );
  throw error;
}

module.exports = prisma;
