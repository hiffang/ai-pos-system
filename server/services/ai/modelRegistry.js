/**
 * Model registry — loads the active model version, validates its manifest,
 * and exposes a single predict() entry point that delegates to the matching
 * adapter. Swapping models is a JSON edit + restart, not a code change.
 */
const fs = require("fs");
const path = require("path");

const { getAdapter } = require("./adapters");

const MODELS_DIR =
  process.env.AI_MODELS_DIR ||
  path.join(__dirname, "../../../ai/models");

/** @type {{ manifest: any, adapter: any, session: any, dir: string } | null} */
let active = null;

function readJson(/** @type {string} */ filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {any} manifest
 * @param {string} dir
 */
function validateManifest(manifest, dir) {
  const required = ["version", "modelType", "horizonDays"];
  for (const key of required) {
    if (manifest[key] === undefined) {
      throw new Error(
        `Manifest at ${dir} is missing required field "${key}"`,
      );
    }
  }
}

async function loadActive() {
  const activePath = path.join(MODELS_DIR, "active.json");
  if (!fs.existsSync(activePath)) {
    throw new Error(`No active.json found at ${activePath}`);
  }
  const activePtr = readJson(activePath);
  if (!activePtr.version) {
    throw new Error(`active.json at ${activePath} has no "version" field`);
  }

  const dir = path.join(MODELS_DIR, activePtr.version);
  const manifestPath = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Manifest not found for active version "${activePtr.version}" at ${manifestPath}`,
    );
  }

  const manifest = readJson(manifestPath);
  validateManifest(manifest, dir);

  const adapter = getAdapter(manifest.modelType);
  const session = await adapter.load(dir, manifest);

  active = { manifest, adapter, session, dir };
  console.log(
    `[AI] Loaded model ${manifest.name || manifest.modelType} v${manifest.version} (type=${manifest.modelType})`,
  );
  return active;
}

async function unload() {
  if (active?.adapter?.unload) {
    await active.adapter.unload(active.session);
  }
  active = null;
}

/**
 * @param {{ id?: string, salesHistory?: number[] }} productData
 * @param {{ horizonDays?: number, asOf?: Date }} [options]
 */
function predict(productData, options) {
  if (!active) {
    throw new Error("Model registry has no active model loaded");
  }
  const horizonDays = options?.horizonDays ?? active.manifest.horizonDays;
  return active.adapter.predict(
    productData,
    {
      horizonDays,
      asOf: options?.asOf,
      modelVersion: active.manifest.version,
    },
    active.session,
    active.manifest,
  );
}

function getStatus() {
  if (!active) {
    return { loaded: false };
  }
  const adapterStatus = active.adapter.status?.(active.session) || {};
  return {
    loaded: true,
    version: active.manifest.version,
    name: active.manifest.name,
    modelType: active.manifest.modelType,
    horizonDays: active.manifest.horizonDays,
    calendarSchemaVersion: active.manifest.calendarSchemaVersion,
    adapter: adapterStatus,
  };
}

module.exports = {
  loadActive,
  unload,
  predict,
  getStatus,
};
