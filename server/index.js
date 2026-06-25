// In the packaged Electron app, environment variables are injected by the
// Electron main process (electron/main.js → configureRuntimeEnv) before this
// server is spawned. dotenv is only needed for standalone `npm run dev` usage.
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config(); } catch { /* dotenv not installed — fine in prod */ }
}
/** @type {import("express")} */
const express = require("express");
/** @type {import("cors")} */
const cors = require("cors");
const helmet =
  /** @type {(options?: any) => import("express").RequestHandler} */ (
    /** @type {unknown} */ (require("helmet"))
  );

// Import services and middleware
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("./db");
const errorHandler = require("./middleware/errorHandler");
const { initializeSession, getModelStatus } = require("./services/aiInference");
const { startSyncDaemon, getSyncStatus } = require("./services/syncDaemon");
const {
  loadActive: loadPrinter,
  getPrinterStatus,
} = require("./services/hardware/printerRegistry");

const { authenticate, requireRole } = require("./middleware/auth");

// Import routes
const aiRoutes = require("./routes/ai");
const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const dashboardRoutes = require("./routes/dashboard");
const discountsRoutes = require("./routes/discounts");
const hardwareRoutes = require("./routes/hardware");
const paymentsRoutes = require("./routes/payments");
const productsRoutes = require("./routes/products");
const promotionsRoutes = require("./routes/promotions");
const transactionsRoutes = require("./routes/transactions");
const usersRoutes = require("./routes/users");

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

function describeDatabaseUrl(rawUrl) {
  if (!rawUrl) return { provider: "unknown" };
  if (rawUrl.startsWith("file:")) {
    let location = rawUrl.replace(/^file:/, "");
    if (location.startsWith("//")) {
      try {
        const parsed = new URL(rawUrl);
        location = decodeURIComponent(parsed.pathname || "");
        if (process.platform === "win32" && location.startsWith("/")) {
          location = location.slice(1);
        }
      } catch {
        // fallback to raw file string
      }
    }
    return { provider: "sqlite", location };
  }

  try {
    const parsed = new URL(rawUrl);
    return {
      provider: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\/+/, "") || undefined,
    };
  } catch {
    return { provider: "unknown" };
  }
}

// Health checks
app.get(
  "/api/health",
  (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      res.json({
        status: "ok",
        timestamp: new Date(),
        environment: process.env.NODE_ENV,
        database: describeDatabaseUrl(process.env.DATABASE_URL),
        aiModelStatus: getModelStatus(),
        syncStatus: getSyncStatus(),
        printerStatus: getPrinterStatus(),
      });
    } catch (error) {
      next(error);
    }
  },
);

// API Routes
//   /api/auth and /api/health are public.
//   All other routes require a valid token (authenticate) and at least
//   the role specified by requireRole(). Routes themselves can apply
//   tighter per-handler guards if needed (e.g. user management endpoints).
app.use("/api/auth", authRoutes);

app.use("/api/products", authenticate, requireRole("CASHIER"), productsRoutes);
app.use(
  "/api/categories",
  authenticate,
  requireRole("CASHIER"),
  categoriesRoutes,
);
app.use(
  "/api/transactions",
  authenticate,
  requireRole("CASHIER"),
  transactionsRoutes,
);
app.use("/api/payments", authenticate, requireRole("CASHIER"), paymentsRoutes);
app.use("/api/hardware", authenticate, requireRole("CASHIER"), hardwareRoutes);

app.use("/api/dashboard", authenticate, requireRole("MANAGER"), dashboardRoutes);
app.use("/api/ai", authenticate, requireRole("MANAGER"), aiRoutes);
app.use("/api/discounts", authenticate, requireRole("MANAGER"), discountsRoutes);
app.use("/api/promotions", authenticate, requireRole("MANAGER"), promotionsRoutes);

app.use("/api/users", authenticate, requireRole("ADMIN"), usersRoutes);

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
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        "[Server] AI model initialization failed (non-critical):",
        message,
      );
      console.warn("[Server] Continuing without AI features");
    }

    // Initialize printer (non-critical — receipt printing fails gracefully if unavailable)
    try {
      await loadPrinter();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        "[Server] Printer initialization failed (non-critical):",
        message,
      );
      console.warn(
        "[Server] Continuing without receipt printing. Set printer.type='noop' in printerConfig.json for a logging-only fallback.",
      );
    }

    // Start sync daemon for offline-first
    startSyncDaemon();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Server] Startup failed:", message);
    process.exit(1);
  }
}

start();
