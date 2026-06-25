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
  getModelStatus,
} = require("../services/aiInference");
const {
  getInsight,
  getCachedInsight,
  forceRefreshInsight,
  getInsightsHistory,
} = require("../services/ai/llmInsight");
const { buildSalesHistories } = require("../services/ai/salesHistory");

const DEFAULT_HISTORY_DAYS = 28;
const MAX_BATCH_SIZE = 100;

// Rate-limit guard for manual refresh — 1 call per 2 minutes
let lastManualRefreshAt = 0;
const MANUAL_REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

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

// ---------------------------------------------------------------------------
// Helpers shared by the insights endpoints
// ---------------------------------------------------------------------------

/**
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  const v = new Date(date);
  v.setHours(0, 0, 0, 0);
  return v;
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function endOfDay(date) {
  const v = new Date(date);
  v.setHours(23, 59, 59, 999);
  return v;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value && "toNumber" in value) {
    // @ts-ignore
    return value.toNumber();
  }
  return Number(value);
}

/**
 * Build forecast data the same way the dashboard does so the LLM prompt is
 * consistent regardless of which route calls it.
 *
 * @returns {Promise<{ forecasts: object[], simplifiedForLLM: object[], summary: object }>}
 */
async function buildInsightPayload() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const sevenDaysAgo = startOfDay(new Date(now.getTime()));
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fourteenDaysAgo = startOfDay(new Date(now.getTime()));
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  const [todayRevenueAgg, ordersTodayCount] = await prisma.$transaction([
    prisma.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amountLKR: true },
    }),
    prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
  ]);

  const allProducts = await prisma.product.findMany({
    select: { stockQty: true, reorderThreshold: true },
  });
  const lowStockItems = allProducts.filter(
    (p) => p.stockQty <= p.reorderThreshold,
  ).length;

  const orderItems = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: fourteenDaysAgo, lte: todayEnd } } },
    include: { product: true, order: { select: { createdAt: true } } },
  });

  const sevenDaysBoundary = startOfDay(new Date(now.getTime()));
  sevenDaysBoundary.setDate(sevenDaysBoundary.getDate() - 6);

  const forecastMap = new Map();
  for (const item of orderItems) {
    const existing = forecastMap.get(item.productId) || {
      productId: item.productId,
      name: item.product.name,
      stockQty: item.product.stockQty,
      threshold: item.product.reorderThreshold,
      recentQty: 0,
      previousQty: 0,
    };
    if (item.order.createdAt >= sevenDaysBoundary) {
      existing.recentQty += item.quantity;
    } else {
      existing.previousQty += item.quantity;
    }
    forecastMap.set(item.productId, existing);
  }

  const topEntries = Array.from(forecastMap.values())
    .sort((a, b) => b.recentQty - a.recentQty)
    .slice(0, 5);

  const histories = await buildSalesHistories(
    topEntries.map((e) => e.productId),
    DEFAULT_HISTORY_DAYS,
  );

  const aiPredictions = await predictInventoryNeeds(
    topEntries.map((e) => ({ id: e.productId, salesHistory: histories.get(e.productId) || [] })),
  );
  const predictionById = new Map(aiPredictions.map((p) => [p.productId, p]));

  const forecasts = topEntries.map((entry) => {
    const prediction = predictionById.get(entry.productId);

    let demandLabel;
    let recommendation;
    let color;

    if (prediction) {
      const ratio = prediction.point / Math.max(entry.recentQty, 1);
      if (prediction.trend === "increasing") {
        demandLabel = `+${Math.round((ratio - 1) * 100)}% Rise`;
      } else if (prediction.trend === "decreasing") {
        demandLabel = `${Math.round((1 - ratio) * 100)}% Drop`;
      } else {
        demandLabel = "Stable";
      }

      if (entry.stockQty <= entry.threshold) {
        recommendation = "REORDER NOW";
        color = "danger";
      } else if (
        prediction.demandLevel === "high" ||
        prediction.demandLevel === "very_high"
      ) {
        recommendation = "MONITOR";
        color = "warning";
      } else {
        recommendation = "SUFFICIENT";
        color = "primary";
      }
    } else {
      const change = entry.previousQty
        ? ((entry.recentQty - entry.previousQty) / entry.previousQty) * 100
        : entry.recentQty > 0 ? 100 : 0;
      if (Math.abs(change) < 3) demandLabel = "Stable";
      else if (change > 0) demandLabel = `+${Math.round(change)}% Rise`;
      else demandLabel = `${Math.round(Math.abs(change))}% Drop`;

      if (entry.stockQty <= entry.threshold) {
        recommendation = "REORDER NOW";
        color = "danger";
      } else if (change >= 10) {
        recommendation = "MONITOR";
        color = "warning";
      } else {
        recommendation = "SUFFICIENT";
        color = "primary";
      }
    }

    return {
      productId: entry.productId,
      productName: entry.name,
      stockQty: entry.stockQty,
      reorderThreshold: entry.threshold,
      point: prediction?.point ?? 0,
      lower: prediction?.lower ?? 0,
      upper: prediction?.upper ?? 0,
      confidence: prediction?.confidence ?? 0,
      demandLevel: prediction?.demandLevel ?? "low",
      trend: prediction?.trend ?? "stable",
      demandLabel,
      recommendation,
      color,
    };
  });

  const simplifiedForLLM = forecasts.map((f) => ({
    product: f.productName,
    stock: `${f.stockQty} Units`,
    demand: f.demandLabel,
    recommendation: f.recommendation,
    color: f.color,
  }));

  const summary = {
    todayRevenue: toNumber(todayRevenueAgg._sum.amountLKR),
    ordersToday: ordersTodayCount,
    lowStockItems,
  };

  return { forecasts, simplifiedForLLM, summary };
}

// GET /api/ai/insights — full insight payload for the Insights page
router.get("/insights", async (req, res, next) => {
  try {
    const { forecasts, simplifiedForLLM, summary } = await buildInsightPayload();

    // Try cache first; generate only if cache miss (same gates as dashboard)
    let insightResult = await getCachedInsight();
    if (!insightResult) {
      insightResult = await getInsight(simplifiedForLLM, summary);
    }

    res.json({
      status: "success",
      data: {
        narrative: insightResult
          ? {
              text: insightResult.narrative,
              fromCache: insightResult.fromCache,
              generatedAt: insightResult.generatedAt,
            }
          : null,
        summary,
        forecasts,
        model: getModelStatus(),
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/insights/history — last 10 insight narratives
router.get("/insights/history", async (req, res, next) => {
  try {
    const history = await getInsightsHistory(10);
    res.json({ status: "success", data: history });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/insights/refresh — force a new Claude API call (rate-limited)
router.post("/insights/refresh", async (req, res, next) => {
  try {
    const now = Date.now();
    const elapsed = now - lastManualRefreshAt;
    if (elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((MANUAL_REFRESH_COOLDOWN_MS - elapsed) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        status: "error",
        message: `Rate limited. Try again in ${retryAfterSec}s.`,
        retryAfterSeconds: retryAfterSec,
      });
    }

    lastManualRefreshAt = now;

    const { simplifiedForLLM, summary } = await buildInsightPayload();
    const insightResult = await forceRefreshInsight(simplifiedForLLM, summary);

    res.json({
      status: "success",
      data: insightResult
        ? {
            text: insightResult.narrative,
            fromCache: insightResult.fromCache,
            generatedAt: insightResult.generatedAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
