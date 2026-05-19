/**
 * Printer registry — loads the active printer adapter from printerConfig.json
 * and exposes a single printReceipt() entry point. Mirrors the model-registry
 * pattern: swap the adapter type in JSON, restart, done.
 */
const fs = require("fs");
const path = require("path");
const { getAdapter } = require("./adapters");
const { buildReceipt } = require("./receiptFormatter");

const CONFIG_PATH =
  process.env.PRINTER_CONFIG_PATH ||
  path.join(__dirname, "printerConfig.json");

/** @type {{ adapter: any, session: any, config: any } | null} */
let active = null;

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Printer config not found at ${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

async function loadActive() {
  const config = readConfig();
  const adapter = getAdapter(config.printer.type);
  const session = await adapter.load(config.printer);
  active = { adapter, session, config };
  console.log(
    `[Printer] Loaded ${adapter.type} adapter (interface=${config.printer.interface || "n/a"})`,
  );
  return active;
}

/**
 * @param {any} order
 */
async function printReceiptFromOrder(order) {
  if (!active) {
    throw new Error("Printer registry has no active adapter loaded");
  }
  const receipt = buildReceipt(order, active.config.shop);
  return active.adapter.print(receipt, active.config.printer, active.session);
}

function getPrinterStatus() {
  if (!active) {
    return { loaded: false };
  }
  return {
    loaded: true,
    type: active.adapter.type,
    interface: active.config.printer.interface,
    adapter: active.adapter.status?.(active.session) || {},
  };
}

module.exports = {
  loadActive,
  printReceiptFromOrder,
  getPrinterStatus,
};
