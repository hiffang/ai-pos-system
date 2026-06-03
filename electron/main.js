const { app, BrowserWindow } = require("electron");
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

  if (!fs.existsSync(cliPath)) {
    console.warn("[Electron] Prisma CLI not found; skipping migrations.");
    return;
  }

  if (!fs.existsSync(schemaPath)) {
    console.warn("[Electron] Prisma schema missing; skipping migrations.");
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [cliPath, "migrate", "deploy", "--schema", schemaPath],
      {
        env: { ...process.env },
        cwd: app.getAppPath(),
        stdio: "inherit",
      },
    );

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Prisma migrate deploy timed out"));
    }, MIGRATION_TIMEOUT_MS);

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
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    cwd: app.getAppPath(),
    stdio: "inherit",
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

  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, "../client/dist/index.html")}`
    : "http://localhost:5173";

  mainWindow.loadURL(startUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    configureRuntimeEnv();
    await runMigrations();
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
