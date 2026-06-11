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
  if (!fs.existsSync(dbPath)) {
    console.log("[beforeBuild] No prisma/pos.db found — running db push to create a seed DB...");
    execSync("npx prisma db push --skip-generate", {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: `file:${dbPath}`,
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
          DATABASE_URL: `file:${dbPath}`,
        },
      });
    }

    console.log("[beforeBuild] Seed database created at prisma/pos.db");
  } else {
    console.log("[beforeBuild] prisma/pos.db already exists — skipping seed.");
  }
};
