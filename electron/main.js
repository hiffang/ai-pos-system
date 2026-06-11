const { app, BrowserWindow } = require("electron");
// Wrap console methods to avoid crashing on EPIPE when stdout/stderr are closed
{
  const methods = ["log", "info", "warn", "error", "debug"];
  for (const m of methods) {
    const orig = console[m].bind(console);
    console[m] = (...args) => {
      try {
        return orig(...args);
      } catch (err) {
        // Ignore EPIPE (broken pipe) which can happen in some Windows installer
        // contexts where stdout/stderr are closed by the parent process.
        if (err && err.code === "EPIPE") return;
        try {
          // fallback to writing to a file under userData
          const fallbackPath = path.join(app.getPath("userData") || ".", "electron.log");
          fs.appendFileSync(fallbackPath, `[${m.toUpperCase()}] ` + args.map(String).join(" ") + "\n");
        } catch (e) {
          // swallow any further errors
        }
      }
    };
  }
}
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { pathToFileURL } = require("url");

let mainWindow;
let serverProcess;

const DEFAULT_PORT = 3000;
const SERVER_TIMEOUT_MS = 10000;
const MIGRATION_TIMEOUT_MS = 20000;

function getRuntimeCwd() {
  if (app.isPackaged) {
    return path.dirname(app.getAppPath());
  }
  return app.getAppPath();
}

function getExecPath() {
  const exePath = app.getPath("exe");
  if (exePath && fs.existsSync(exePath)) return exePath;
  if (process.execPath && fs.existsSync(process.execPath)) return process.execPath;
  return process.execPath || exePath || "";
}

function loadRootEnv() {
  const envPath = path.join(app.getAppPath(), ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function ensureJwtSecret(userDataPath) {
  if (process.env.JWT_SECRET) return;
  const secretPath = path.join(userDataPath, "jwt-secret.txt");
  if (fs.existsSync(secretPath)) {
    process.env.JWT_SECRET = fs.readFileSync(secretPath, "utf8").trim();
    return;
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, secret, "utf8");
  process.env.JWT_SECRET = secret;
}

function ensureDatabase(userDataPath) {
  const dataDir = path.join(userDataPath, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "pos.db");

  if (!fs.existsSync(dbPath)) {
    const bundledDb = path.join(app.getAppPath(), "prisma", "pos.db");
    if (fs.existsSync(bundledDb)) {
      fs.copyFileSync(bundledDb, dbPath);
    }
  }

  const url = pathToFileURL(dbPath).href;
  if (!process.env.DATABASE_URL || app.isPackaged) {
    process.env.DATABASE_URL = url;
  }
}

function configureRuntimeEnv() {
  loadRootEnv();

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = app.isPackaged ? "production" : "development";
  }
  if (!process.env.PORT) {
    process.env.PORT = String(DEFAULT_PORT);
  }
  process.env.APP_URL = `http://localhost:${process.env.PORT}`;

  const userDataPath = app.getPath("userData");
  fs.mkdirSync(userDataPath, { recursive: true });
  ensureJwtSecret(userDataPath);
  ensureDatabase(userDataPath);
}

function getPrismaCliPath() {
  return path.join(app.getAppPath(), "node_modules", "prisma", "build", "index.js");
}

async function runMigrations() {
  if (!app.isPackaged) return;
  const cliPath = getPrismaCliPath();
  const schemaPath = path.join(app.getAppPath(), "prisma", "schema.prisma");
  const execPath = getExecPath();

  if (!fs.existsSync(cliPath)) {
    console.warn("[Electron] Prisma CLI not found; skipping migrations.");
    return;
  }

  if (!fs.existsSync(schemaPath)) {
    console.warn("[Electron] Prisma schema missing; skipping migrations.");
    return;
  }

  if (!execPath || !fs.existsSync(execPath)) {
    console.warn("[Electron] Electron executable not found; skipping migrations.");
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(
      execPath,
      [cliPath, "migrate", "deploy", "--schema", schemaPath],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        cwd: getRuntimeCwd(),
        stdio: "inherit",
      },
    );

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Prisma migrate deploy timed out"));
    }, MIGRATION_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma migrate deploy failed (exit ${code})`));
      }
    });
  });
}

async function isServerReady(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(port) {
  const start = Date.now();
  while (Date.now() - start < SERVER_TIMEOUT_MS) {
    if (await isServerReady(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function startServerIfNeeded() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  if (await isServerReady(port)) return port;

  const serverPath = path.join(app.getAppPath(), "server", "index.js");
  const execPath = getExecPath();
  if (!execPath || !fs.existsSync(execPath)) {
    throw new Error("Electron executable not found; cannot start server");
  }

  serverProcess = spawn(execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    cwd: getRuntimeCwd(),
    stdio: "inherit",
  });

  serverProcess.on("error", (error) => {
    console.error("[Electron] Failed to spawn server:", error);
  });

  serverProcess.on("exit", (code, signal) => {
    console.log("[Electron] Server exited", { code, signal });
    serverProcess = null;
  });

  const ok = await waitForServer(port);
  if (!ok) {
    throw new Error("Server failed to start within timeout");
  }
  return port;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  if (process.env.ELECTRON_DEBUG === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.error("[Electron] Window failed to load", { code, desc, url });
  });

  mainWindow.webContents.on("console-message", (_event, level, message) => {
    console.log(`[Renderer:${level}] ${message}`);
  });

  if (app.isPackaged) {
    const indexPath = path.join(app.getAppPath(), "client", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    configureRuntimeEnv();
    try {
      await runMigrations();
    } catch (error) {
      console.warn("[Electron] Migration skipped:", error);
    }
    await startServerIfNeeded();
    createWindow();
  } catch (error) {
    console.error("[Electron] Startup failed:", error);
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
