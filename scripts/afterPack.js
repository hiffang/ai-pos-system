// electron-builder afterPack hook
//
// electron-builder auto-injects "!node_modules" into the file filter before
// user patterns, so node_modules never reaches the staging directory.
// This hook runs after files are staged but before NSIS packages them,
// so we do an explicit production install right in the staging app dir.

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = async function afterPack({ appOutDir }) {
  const appDir = path.join(appOutDir, "resources", "app");

  console.log("[afterPack] Installing production dependencies in", appDir);

  // --prefer-offline uses local npm cache first — fast on the build machine
  // --no-audit / --no-fund suppress network calls that add noise
  // --ignore-scripts avoids optional native-build failures (e.g. onnxruntime-node);
  //   we run prisma generate ourselves right after.
  execSync(
    "npm install --production --prefer-offline --no-audit --no-fund --ignore-scripts",
    { cwd: appDir, stdio: "inherit" }
  );

  // Re-run prisma generate so the correct platform binary lands in staging.
  // The schema is already there (prisma/**/* is in the files list).
  const prismaCli = path.join(appDir, "node_modules", "prisma", "build", "index.js");
  const schemaPath = path.join(appDir, "prisma", "schema.prisma");
  if (fs.existsSync(prismaCli) && fs.existsSync(schemaPath)) {
    console.log("[afterPack] Running prisma generate...");
    execSync(
      `"${process.execPath}" "${prismaCli}" generate --schema "${schemaPath}"`,
      { cwd: appDir, stdio: "inherit", env: { ...process.env } }
    );
  } else {
    console.warn("[afterPack] prisma CLI or schema not found — skipping generate");
  }

  console.log("[afterPack] Done.");
};
