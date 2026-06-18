/**
 * electron-builder beforeBuild hook
 *
 * Runs before electron-builder packages the app.
 * Ensures:
 *   1. prisma generate — regenerates the Prisma client so the correct
 *      native query-engine binary is bundled for the target platform.
 *   2. A seed database (prisma/pos.db) exists so first-run users don't
 *      hit "no database" on startup.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = async function beforeBuild({ appDir }) {
  console.log("[beforeBuild] Running prisma generate...");
  execSync("npx prisma generate", {
    cwd: appDir,
    stdio: "inherit",
  });
  console.log("[beforeBuild] prisma generate complete.");

  // Seed an empty database into prisma/ so ensureDatabase() in main.js can
  // copy it to userData on first launch.  This avoids a blank-screen startup
  // caused by Prisma finding no database file when the user first runs the app.
  const dbPath = path.join(appDir, "prisma", "pos.db");
  // Prisma's SQLite engine on Windows expects "file:C:/..." (forward slashes,
  // no triple-slash). Using backslashes or file:/// causes path misparse.
  const dbUrl = "file:" + dbPath.replace(/\\/g, "/");

  // Always regenerate the seed DB from migrations so it always has a clean
  // _prisma_migrations history. An existing pos.db from `db push` or prisma
  // studio would have no history, causing runMigrations() to fail on first
  // install. pos.db is only a bundled template — the live DB lives in userData.
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("[beforeBuild] Removed existing prisma/pos.db — will regenerate with correct migration history.");
  }

  console.log("[beforeBuild] Running migrate deploy to create seed DB...");
  execSync("npx prisma migrate deploy", {
    cwd: appDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });

  // Optionally seed initial data (categories, admin user, etc.)
  const seedPath = path.join(appDir, "prisma", "seed.js");
  if (fs.existsSync(seedPath)) {
    console.log("[beforeBuild] Running seed script...");
    execSync("node prisma/seed.js", {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
      },
    });
  }

  console.log("[beforeBuild] Seed database created at prisma/pos.db");
};
