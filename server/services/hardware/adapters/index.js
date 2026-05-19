/**
 * Adapter dispatch for printer hardware.
 *
 * To add a new printer type (e.g. brand-specific protocol), implement an
 * adapter module with the same shape as ./noop.js — { type, load, print,
 * status } — and register it in ADAPTERS below.
 */
const noop = require("./noop");
const escpos = require("./escpos");

const ADAPTERS = {
  [noop.type]: noop,
  [escpos.type]: escpos,
};

/**
 * @param {string} type
 */
function getAdapter(type) {
  const adapter = ADAPTERS[type];
  if (!adapter) {
    throw new Error(
      `No printer adapter registered for type "${type}". Known: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  return adapter;
}

module.exports = { getAdapter };
