require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// Import services and middleware
const prisma = require("./db");
const errorHandler = require("./middleware/errorHandler");
const { initializeSession, getModelStatus } = require("./services/aiInference");
const { startSyncDaemon, getSyncStatus } = require("./services/syncDaemon");

// Import routes
const categoriesRoutes = require("./routes/categories");
const paymentsRoutes = require("./routes/payments");
const productsRoutes = require("./routes/products");
const transactionsRoutes = require("./routes/transactions");

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Validate environment variables on startup
function validateEnvironment() {
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "NODE_ENV", "PORT"];

  const missing = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  console.log("[Server] Environment validation passed");
}

// Health checks
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    aiModelStatus: getModelStatus(),
    syncStatus: getSyncStatus(),
  });
});

// API Routes
app.use("/api/categories", categoriesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/transactions", transactionsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  console.log("[Server] Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
async function start() {
  try {
    validateEnvironment();

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("[Server] Database connection successful");

    // Initialize AI model
    try {
      await initializeSession();
    } catch (err) {
      console.warn(
        "[Server] AI model initialization failed (non-critical):",
        err.message,
      );
      console.warn("[Server] Continuing without AI features");
    }

    // Start sync daemon for offline-first
    startSyncDaemon();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("[Server] Startup failed:", error.message);
    process.exit(1);
  }
}

start();
