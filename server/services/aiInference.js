/**
 * AI Inference Service — thin facade over the model registry.
 *
 * Public API is unchanged from previous versions so existing callers
 * (server/index.js startup + health endpoint) keep working. All routing
 * to a specific model implementation happens in server/services/ai/.
 */
const registry = require("./ai/modelRegistry");

/**
 * Load the active model from the registry. Called once on server startup.
 * Throws on configuration errors so a misconfigured deploy fails fast.
 * @returns {Promise<void>}
 */
async function initializeSession() {
  await registry.loadActive();
}

/**
 * Forecast demand for a single product over the active model's horizon.
 * Returns null on inference failure — predictions must never block POS ops.
 *
 * @param {{ id?: string, salesHistory?: number[] }} productData
 * @param {{ horizonDays?: number, asOf?: Date }} [options]
 * @returns {Promise<import("./ai/predictionContract").Prediction | null>}
 */
async function forecastDemand(productData, options) {
  try {
    return registry.predict(productData, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Forecast failed:", message);
    return null;
  }
}

/**
 * Batch-forecast a list of products.
 * @param {Array<{ id?: string, salesHistory?: number[] }>} products
 * @param {{ horizonDays?: number, asOf?: Date }} [options]
 */
async function predictInventoryNeeds(products, options) {
  try {
    const predictions = [];
    for (const product of products) {
      const forecast = await forecastDemand(product, options);
      if (forecast) predictions.push(forecast);
    }
    return predictions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Inventory prediction failed:", message);
    return [];
  }
}

/**
 * Health-check info surfaced via /api/health.
 */
function getModelStatus() {
  return registry.getStatus();
}

module.exports = {
  initializeSession,
  forecastDemand,
  predictInventoryNeeds,
  getModelStatus,
};
