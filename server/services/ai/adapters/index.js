/**
 * Adapter dispatch.
 *
 * When adding a new model type (e.g. lightgbm-quantile, tft), implement an
 * adapter module with the same shape as ./heuristic.js — { modelType, load,
 * predict, status } — and register it in ADAPTERS below.
 */
const heuristic = require("./heuristic");

const ADAPTERS = {
  [heuristic.modelType]: heuristic,
};

/**
 * @param {string} modelType
 */
function getAdapter(modelType) {
  const adapter = ADAPTERS[modelType];
  if (!adapter) {
    throw new Error(
      `No adapter registered for modelType "${modelType}". ` +
        `Known types: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  return adapter;
}

module.exports = { getAdapter };
