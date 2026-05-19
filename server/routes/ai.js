/**
 * AI Routes
 * Demand forecasting endpoints. Returns the normalized prediction contract
 * defined in services/ai/predictionContract.js — consumers depend on the
 * shape, not on the underlying model implementation.
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const {
  forecastDemand,
  predictInventoryNeeds,
} = require("../services/aiInference");

const DEFAULT_HISTORY_DAYS = 28;
const MAX_BATCH_SIZE = 100;

/**
 * @param {string} message
 * @param {number} statusCode
 */
function createHttpError(message, statusCode) {
  const error = /** @type {Error & { statusCode?: number }} */ (
    new Error(message)
  );
  error.statusCode = statusCode;
  return error;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Build a dense per-day sales array (oldest → newest) for one or more products.
 * Days with no sales are zero-filled so the model sees the gap signal.
 *
 * @param {string[]} productIds
 * @param {number} days
 * @returns {Promise<Map<string, number[]>>}
 */
async function buildSalesHistories(productIds, days) {
  /** @type {Map<string, number[]>} */
  const result = new Map();
  if (productIds.length === 0) return result;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days);

  const items = await prisma.orderItem.findMany({
    where: {
      productId: { in: productIds },
      order: { createdAt: { gte: since } },
    },
    select: {
      productId: true,
      quantity: true,
      order: { select: { createdAt: true } },
    },
  });

  /** @type {Map<string, Map<string, number>>} */
  const buckets = new Map();
  for (const id of productIds) buckets.set(id, new Map());

  for (const item of items) {
    const bucket = buckets.get(item.productId);
    if (!bucket) continue;
    const key = toDateKey(item.order.createdAt);
    bucket.set(key, (bucket.get(key) || 0) + item.quantity);
  }

  for (const productId of productIds) {
    const bucket = buckets.get(productId) || new Map();
    const series = [];
    const cursor = new Date(since);
    for (let i = 0; i < days; i++) {
      series.push(bucket.get(toDateKey(cursor)) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    result.set(productId, series);
  }

  return result;
}

// GET /api/ai/forecast/:productId
router.get(
  "/forecast/:productId",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { productId } = req.params;
      if (!productId) {
        throw createHttpError("Product ID is required", 400);
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true },
      });
      if (!product) {
        throw createHttpError("Product not found", 404);
      }

      const histories = await buildSalesHistories(
        [productId],
        DEFAULT_HISTORY_DAYS,
      );
      const salesHistory = histories.get(productId) || [];

      const prediction = await forecastDemand({ id: productId, salesHistory });
      if (!prediction) {
        throw createHttpError("Forecast unavailable", 503);
      }

      res.json({
        status: "success",
        data: { ...prediction, productName: product.name },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/ai/forecast/batch
router.post(
  "/forecast/batch",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { productIds } = req.body || {};
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw createHttpError("productIds must be a non-empty array", 400);
      }
      if (productIds.length > MAX_BATCH_SIZE) {
        throw createHttpError(
          `Batch size exceeds maximum of ${MAX_BATCH_SIZE}`,
          400,
        );
      }

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const productNameById = new Map(products.map((p) => [p.id, p.name]));
      const knownIds = products.map((p) => p.id);
      const missing = productIds.filter(
        (/** @type {string} */ id) => !productNameById.has(id),
      );

      const histories = await buildSalesHistories(
        knownIds,
        DEFAULT_HISTORY_DAYS,
      );
      const inputs = knownIds.map((id) => ({
        id,
        salesHistory: histories.get(id) || [],
      }));

      const predictions = await predictInventoryNeeds(inputs);
      const enriched = predictions.map((p) => ({
        ...p,
        productName: p.productId ? productNameById.get(p.productId) : null,
      }));

      res.json({
        status: "success",
        data: enriched,
        missing,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
