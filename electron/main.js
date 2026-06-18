/**
 * Electron main process — zero third-party dependencies.
 *
 * Architecture: asar:false means all files are extracted normally into
 * resources/app/. node_modules sits next to server/ and electron/ just
 * like a regular Node project, so require() resolution works without
 * any special tricks.
 *
 * Boot sequence:
 *   1. configureRuntimeEnv()  — parse .env, set DATABASE_URL + JWT_SECRET
 *   2. showSplash()           — visible immediately while server starts
 *   3. runMigrations()        — deploy pending schema migrations
 *   4. startServer()          — spawn Express as child process
 *   5. waitForServer()        — poll /api/health
 *   6. createMainWindow()     — load React SPA, close splash
 */

const { app, BrowserWindow } = require("electron");
const path    = require("path");
const fs      = require("fs");
const crypto  = require("crypto");
const { spawn } = require("child_process");

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PORT         = 3000;
const SERVER_TIMEOUT_MS    = 30_000;
const MIGRATION_TIMEOUT_MS = 40_000;
const POLL_INTERVAL_MS     = 300;

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow    = null;
let splashWindow  = null;
let serverProcess = null;

// ─── File logger ─────────────────────────────────────────────────────────────
// stdout/stderr are closed in packaged Windows apps — always write to a file.

let _logPath = null;

function getLogPath() {
  if (_logPath) return _logPath;
  try {
    const dir = app.getPath("userData");
    fs.mkdirSync(dir, { recursive: true });
    _logPath = path.join(dir, "electron.log");
  } catch {
    _logPath = path.join(".", "electron.log");
  }
  return _logPath;
}

function writeLog(level, ...args) {
  const line = `[${new Date().toISOString()}] [${level}] ${args.map(String).join(" ")}\n`;
  try { fs.appendFileSync(getLogPath(), line); } catch { /* swallow */ }
}

{
  const methods = ["log", "info", "warn", "error", "debug"];
  for (const m of methods) {
    const orig = console[m].bind(console);
    console[m] = (...args) => {
      writeLog(m.toUpperCase(), ...args);
      try { orig(...args); } catch (e) {
        if (e && e.code !== "EPIPE") writeLog("ERROR", "console write failed:", e.message);
      }
    };
  }
}

// ─── Path helpers ─────────────────────────────────────────────────────────────
//
// asar:false layout on disk:
//   resources/
//     app/                   ← app.getAppPath()
//       electron/main.js
//       server/index.js
//       node_modules/        ← right here, next to server/
//       prisma/
//       client/dist/
//       package.json

function appRoot() {
  return app.getAppPath();   // .../resources/app  (real directory, not asar)
}

function spawnCwd() {
  return appRoot();          // node_modules is at appRoot/node_modules
}

// ─── Pure-Node .env parser ────────────────────────────────────────────────────

function loadRootEnv() {
  const envPath = path.join(appRoot(), ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch (err) {
    console.warn("[Electron] .env parse error:", err.message);
  }
}

// ─── Environment setup ────────────────────────────────────────────────────────

function ensureJwtSecret(userDataPath) {
  if (process.env.JWT_SECRET) return;
  const p = path.join(userDataPath, "jwt-secret.txt");
  if (fs.existsSync(p)) {
    process.env.JWT_SECRET = fs.readFileSync(p, "utf8").trim();
    return;
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(p, secret, "utf8");
  process.env.JWT_SECRET = secret;
}

function ensureDatabase(userDataPath) {
  const dataDir = path.join(userDataPath, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "pos.db");

  if (!fs.existsSync(dbPath)) {
    const bundled = path.join(appRoot(), "prisma", "pos.db");
    if (fs.existsSync(bundled)) {
      fs.copyFileSync(bundled, dbPath);
      console.log("[Electron] Copied seed database to", dbPath);
    } else {
      console.warn("[Electron] No bundled pos.db — Prisma will create a blank database");
    }
  }

  // Always use the writable userData copy in production.
  // Prisma's SQLite engine expects "file:C:/absolute/path" on Windows —
  // pathToFileURL produces "file:///C:/..." which Prisma misparses against cwd.
  if (app.isPackaged || !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:" + dbPath.replace(/\\/g, "/");
    console.log("[Electron] DATABASE_URL =", process.env.DATABASE_URL);
  }
}

function configureRuntimeEnv() {
  loadRootEnv();
  process.env.NODE_ENV = process.env.NODE_ENV || (app.isPackaged ? "production" : "development");
  process.env.PORT     = process.env.PORT || String(DEFAULT_PORT);
  process.env.APP_URL  = `http://localhost:${process.env.PORT}`;

  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  ensureJwtSecret(userData);
  ensureDatabase(userData);

  console.log("[Electron] appRoot  =", appRoot());
  console.log("[Electron] NODE_ENV =", process.env.NODE_ENV);
  console.log("[Electron] PORT     =", process.env.PORT);
}

// ─── Splash window ────────────────────────────────────────────────────────────

function showSplash() {
  splashWindow = new BrowserWindow({
    width: 420, height: 280,
    frame: false, resizable: false, center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,'Segoe UI',sans-serif;background:#1a1a2e;color:#e0e0e0;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    height:100vh;gap:20px;user-select:none}
  h1{font-size:22px;font-weight:600;color:#fff}
  p{font-size:13px;color:#888}
  .bar-wrap{width:260px;height:4px;background:#2a2a4a;border-radius:2px;overflow:hidden}
  .bar{height:100%;width:30%;background:#6c63ff;border-radius:2px;
    animation:slide 1.4s ease-in-out infinite}
  @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(433%)}}
</style></head><body>
  <h1>AI POS System</h1>
  <div class="bar-wrap"><div class="bar"></div></div>
  <p>Starting up, please wait…</p>
</body></html>`;

  splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  splashWindow.on("closed", () => { splashWindow = null; });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ─── Migrations ───────────────────────────────────────────────────────────────

async function runMigrations() {
  if (!app.isPackaged) return;

  const cliPath       = path.join(appRoot(), "node_modules", "prisma", "build", "index.js");
  const schemaPath    = path.join(appRoot(), "prisma", "schema.prisma");
  const migrationsDir = path.join(appRoot(), "prisma", "migrations");

  if (!fs.existsSync(cliPath)) {
    console.warn("[Electron] Prisma CLI not found at", cliPath, "— skipping migrations");
    return;
  }
  if (!fs.existsSync(schemaPath)) {
    console.warn("[Electron] schema.prisma not found — skipping migrations");
    return;
  }

  const runCLI = (args) => new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [cliPath, ...args],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        cwd: spawnCwd(),
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    child.stdout.on("data", d => console.log("[Migrate]", d.toString().trimEnd()));
    child.stderr.on("data", d => console.warn("[Migrate]", d.toString().trimEnd()));
    const t = setTimeout(() => { child.kill(); reject(new Error("migrate timed out")); }, MIGRATION_TIMEOUT_MS);
    child.on("error", err  => { clearTimeout(t); reject(err); });
    child.on("exit",  code => {
      clearTimeout(t);
      code === 0 ? resolve() : reject(new Error(`migrate exited ${code}`));
    });
  });

  console.log("[Electron] Running prisma migrate deploy…");
  try {
    await runCLI(["migrate", "deploy", "--schema", schemaPath]);
    console.log("[Electron] Migrations complete");
    return;
  } catch (err) {
    console.warn("[Electron] migrate deploy failed:", err.message);
  }

  // migrate deploy failed — most likely the database was created with
  // `prisma db push` and has no _prisma_migrations history. Baseline all
  // known migrations (mark them as already applied) then retry.
  if (!fs.existsSync(migrationsDir)) {
    console.warn("[Electron] No migrations directory — skipping baseline");
    return;
  }

  let migrationNames;
  try {
    migrationNames = fs.readdirSync(migrationsDir)
      .filter(name => fs.statSync(path.join(migrationsDir, name)).isDirectory())
      .sort();
  } catch (err) {
    console.warn("[Electron] Could not read migrations dir:", err.message);
    return;
  }

  if (migrationNames.length === 0) {
    console.warn("[Electron] No migration folders found — skipping baseline");
    return;
  }

  console.log("[Electron] Baselining", migrationNames.length, "migration(s) for existing database…");
  for (const name of migrationNames) {
    try {
      await runCLI(["migrate", "resolve", "--applied", name, "--schema", schemaPath]);
      console.log("[Electron] Baselined:", name);
    } catch (err) {
      // Migration may already be recorded — log but continue
      console.warn("[Electron] Baseline note for", name + ":", err.message);
    }
  }

  try {
    await runCLI(["migrate", "deploy", "--schema", schemaPath]);
    console.log("[Electron] Migrations complete (after baseline)");
  } catch (err) {
    console.warn("[Electron] Migration warning (non-fatal):", err.message);
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function isServerReady(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    return res.ok;
  } catch { return false; }
}

async function waitForServer(port) {
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isServerReady(port)) return true;
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

async function startServer() {
  const port       = Number(process.env.PORT || DEFAULT_PORT);
  const serverPath = path.join(appRoot(), "server", "index.js");

  if (!fs.existsSync(serverPath)) {
    throw new Error(`server/index.js not found at: ${serverPath}`);
  }

  if (await isServerReady(port)) {
    console.log("[Electron] Server already running on port", port);
    return port;
  }

  console.log("[Electron] Spawning server…", serverPath);

  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ELECTRON_APP_PATH: appRoot(),
    },
    cwd: spawnCwd(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", d => console.log("[Server]",     d.toString().trimEnd()));
  serverProcess.stderr.on("data", d => console.error("[Server:ERR]", d.toString().trimEnd()));
  serverProcess.on("error", err  => console.error("[Electron] spawn error:", err.message));
  serverProcess.on("exit",  (code, sig) => {
    console.log("[Electron] Server exited — code:", code, "signal:", sig);
    serverProcess = null;
  });

  const ready = await waitForServer(port);
  if (!ready) {
    throw new Error(
      `Server did not become ready within ${SERVER_TIMEOUT_MS / 1000}s.\nCheck log: ${getLogPath()}`
    );
  }

  console.log("[Electron] Server ready on port", port);
  return port;
}

// ─── Main window ──────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false },
  });

  if (process.env.ELECTRON_DEBUG === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("[Electron] Window load failed", { code, desc, url });
  });

  mainWindow.once("ready-to-show", () => {
    closeSplash();
    mainWindow.show();
  });

  if (app.isPackaged) {
    const indexPath = path.join(appRoot(), "client", "dist", "index.html");
    console.log("[Electron] loadFile:", indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log("[Electron] App ready");
  console.log("[Electron] Log:", getLogPath());

  showSplash();

  try {
    configureRuntimeEnv();

    try {
      await runMigrations();
    } catch (err) {
      console.warn("[Electron] Migration warning (non-fatal):", err.message);
    }

    await startServer();
    createMainWindow();

  } catch (err) {
    console.error("[Electron] Fatal:", err.message);
    closeSplash();
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "AI POS System — Startup Failed",
      `${err.message}\n\nLog file:\n${getLogPath()}`
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createMainWindow();
});
