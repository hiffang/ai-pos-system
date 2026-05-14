/**
 * AI Inference Service
 * Handles ONNX model inference for demand forecasting, stock predictions, etc.
 * Uses onnxruntime-node for on-device inference
 */
/** @type {import("onnxruntime-node")} */
const ort = require("onnxruntime-node");
const path = require("path");

/** @type {import("onnxruntime-node").InferenceSession | null} */
let session = null;
/** @type {string} */
let modelPath =
  process.env.MODEL_PATH || path.join(__dirname, "../../ai/model.onnx");

/**
 * Initialize ONNX inference session
 * Call this once during server startup
 * @returns {Promise<void>}
 */
async function initializeSession() {
  try {
    if (session) {
      console.log("[AI] Session already initialized");
      return;
    }

    console.log(`[AI] Initializing model from: ${modelPath}`);
    session = await ort.InferenceSession.create(modelPath);
    console.log("[AI] Model loaded successfully");
    console.log("[AI] Input names:", session.inputNames);
    console.log("[AI] Output names:", session.outputNames);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Failed to initialize model:", message);
    throw new Error(`AI model initialization failed: ${message}`);
  }
}

/**
 * Run demand forecast on product data
 * @param {{ id?: string, salesHistory?: number[] }} productData - Historical sales data for product
 * @returns {Promise<{ product?: string, demandLevel: string, demandScore: number, trend: string, confidence: number, timestamp: Date } | null>} - Forecast results
 */
async function forecastDemand(productData) {
  try {
    if (!session) {
      throw new Error("AI session not initialized");
    }

    const salesHistory = Array.isArray(productData.salesHistory)
      ? productData.salesHistory
      : [];

    // Normalize input data to model expectations
    // TODO: Adjust based on actual model input format
    const tensorType = /** @type {any} */ ("float32");
    const inputs = {
      float_input: new ort.Tensor(tensorType, [salesHistory]),
    };

    // Run inference
    /** @type {Record<string, import("onnxruntime-node").Tensor>} */
    const outputs = await session.run(inputs);

    const demandOutput = outputs[session.outputNames[0]];
    const trendOutput = outputs[session.outputNames[1]];

    // Extract and normalize outputs
    // TODO: Parse based on actual model output format
    const demandScore = Number(demandOutput?.data?.[0] ?? 0); // Typically 0-1 scale
    const trendValue = Number(trendOutput?.data?.[0] ?? 0); // Trend direction: -1 (down), 0 (flat), 1 (up)

    return {
      product: productData.id,
      demandLevel: categorizeDemand(demandScore),
      demandScore,
      trend: categorizeTrend(trendValue),
      confidence: Math.min(1, demandScore * 0.9 + 0.1), // Simulated confidence
      timestamp: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Forecast failed:", message);
    // Return null for inference failures (don't block POS operations)
    return null;
  }
}

/**
 * Run inventory prediction on all products
 * @param {Array<{ id?: string, salesHistory?: number[] }>} products - Array of product data
 * @returns {Promise<Array<{ product?: string, demandLevel: string, demandScore: number, trend: string, confidence: number, timestamp: Date }>>} - Predictions for each product
 */
async function predictInventoryNeeds(products) {
  try {
    if (!session) {
      throw new Error("AI session not initialized");
    }

    const predictions = [];
    for (const product of products) {
      const forecast = await forecastDemand(product);
      if (forecast) {
        predictions.push(forecast);
      }
    }

    return predictions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AI] Inventory prediction failed:", message);
    return [];
  }
}

/**
 * Categorize demand score into human-readable levels
 * @param {number} score - Demand score (0-1)
 * @returns {string} - Demand level
 */
function categorizeDemand(score) {
  if (score >= 0.8) return "very_high";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.2) return "low";
  return "very_low";
}

/**
 * Categorize trend into human-readable direction
 * @param {number} trend - Trend value (-1, 0, 1)
 * @returns {string} - Trend direction
 */
function categorizeTrend(trend) {
  if (trend > 0.1) return "increasing";
  if (trend < -0.1) return "decreasing";
  return "stable";
}

/**
 * Health check for AI model
 * @returns {object} - Model status information
 */
function getModelStatus() {
  return {
    loaded: session !== null,
    modelPath,
    inputNames: session?.inputNames || [],
    outputNames: session?.outputNames || [],
  };
}

module.exports = {
  initializeSession,
  forecastDemand,
  predictInventoryNeeds,
  getModelStatus,
};
