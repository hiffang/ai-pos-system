/**
 * Dashboard Routes
 * Provides aggregated metrics for the dashboard UI
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { predictInventoryNeeds } = require("../services/aiInference");
const { getInsight } = require("../services/ai/llmInsight");

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (typeof value === "object" && value && "toNumber" in value) {
    // @ts-ignore - Decimal.js exposes toNumber.
    return value.toNumber();
  }
  return Number(value);
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

/**
 * @param {Date} date
 * @returns {Date}
 */
function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

/**
 * @param {Date} date
 * @returns {string}
 *
 * Builds the date key from LOCAL components, not UTC. The trend loop creates
 * date objects via setHours(0, 0, 0, 0) (local midnight) and the weekday
 * labels are formatted in local time — using date.toISOString() here would
 * silently shift those keys back to the previous UTC day for any timezone
 * east of UTC (e.g. Sri Lanka UTC+5:30), making today's sales disappear
 * from the chart and misaligning labels with their dates.
 */
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param {Date} date
 * @returns {string}
 */
function toWeekdayLabel(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

/**
 * Return the local start-of-Sunday on or before the given date.
 * @param {Date} date
 * @returns {Date}
 */
function startOfWeek(date) {
  const value = startOfDay(date);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

/**
 * Short "May 17" style label for a week-start date.
 * @param {Date} date
 * @returns {string}
 */
function toWeekLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * @param {number} change
 * @returns {string}
 */
function formatDemand(change) {
  if (Math.abs(change) < 3) return "Stable";
  if (change > 0) {
    return `+${Math.round(change)}% Rise`;
  }
  return `${Math.round(Math.abs(change))}% Drop`;
}

/**
 * @param {number} change
 * @param {number} stockQty
 * @param {number} threshold
 * @returns {{ recommendation: string, color: string }}
 */
function getRecommendation(change, stockQty, threshold) {
  if (stockQty <= threshold) {
    return { recommendation: "REORDER NOW", color: "danger" };
  }
  if (change >= 10) {
    return { recommendation: "MONITOR", color: "warning" };
  }
  return { recommendation: "SUFFICIENT", color: "primary" };
}

// GET /api/dashboard/overview - Aggregated dashboard metrics
router.get(
  "/overview",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const sevenDaysAgo = startOfDay(new Date(now.getTime()));
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const fourteenDaysAgo = startOfDay(new Date(now.getTime()));
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

      const [todayRevenueAgg, ordersTodayCount] = await prisma.$transaction([
        prisma.payment.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: { gte: todayStart, lte: todayEnd },
          },
          _sum: { amountLKR: true },
        }),
        prisma.order.count({
          where: { createdAt: { gte: todayStart, lte: todayEnd } },
        }),
      ]);

      const allProducts = await prisma.product.findMany({
        select: { id: true, name: true, stockQty: true, reorderThreshold: true },
      });
      const lowStockCount = allProducts.filter(
        (p) => p.stockQty <= p.reorderThreshold,
      ).length;
      const reorderAlerts = allProducts
        .filter((p) => p.stockQty <= p.reorderThreshold)
        .map((p) => ({
          productId: p.id,
          productName: p.name,
          stockQty: p.stockQty,
          reorderThreshold: p.reorderThreshold,
        }))
        .sort((a, b) => a.stockQty - b.stockQty);

      // Include PENDING payments (cashier-confirmed but gateway-unverified) as
      // well as COMPLETED; exclude only FAILED so the mix reflects real sales.
      const paymentsByMethod = await prisma.payment.groupBy({
        by: ["method"],
        where: {
          status: { not: "FAILED" },
          createdAt: { gte: sevenDaysAgo, lte: todayEnd },
        },
        _sum: { amountLKR: true },
        _count: { _all: true },
      });

      const paymentMethods = paymentsByMethod.map((entry) => {
        const amount = toNumber(entry._sum.amountLKR);
        return {
          method: entry.method,
          amount,
          count: entry._count._all,
        };
      });
      const totalPaymentsAmount = paymentMethods.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );
      const paymentMethodBreakdown = paymentMethods.map((entry) => ({
        ...entry,
        percentage: totalPaymentsAmount
          ? Math.round((entry.amount / totalPaymentsAmount) * 100)
          : 0,
      }));

      const ordersLastWeek = await prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo, lte: todayEnd } },
        select: { createdAt: true, totalLKR: true },
      });

      const salesByDay = new Map();
      for (const order of ordersLastWeek) {
        const key = toDateKey(order.createdAt);
        const current = salesByDay.get(key) || 0;
        salesByDay.set(key, current + toNumber(order.totalLKR));
      }

      const salesTrend = [];
      for (let i = 0; i < 7; i += 1) {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const key = toDateKey(date);
        salesTrend.push({
          date: key,
          label: toWeekdayLabel(date).toUpperCase(),
          total: salesByDay.get(key) || 0,
        });
      }

      // Weekly trend — 4 buckets, each a Sun..Sat window in local time.
      // Bucket key is the Sunday's date string; same UTC-vs-local discipline
      // as the daily trend so order timestamps map to the correct shop week.
      const thisWeekStart = startOfWeek(now);
      const fourWeeksAgo = new Date(thisWeekStart);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 21);

      const ordersLastFourWeeks = await prisma.order.findMany({
        where: { createdAt: { gte: fourWeeksAgo, lte: todayEnd } },
        select: { createdAt: true, totalLKR: true },
      });

      const salesByWeek = new Map();
      for (const order of ordersLastFourWeeks) {
        const weekKey = toDateKey(startOfWeek(order.createdAt));
        salesByWeek.set(
          weekKey,
          (salesByWeek.get(weekKey) || 0) + toNumber(order.totalLKR),
        );
      }

      const salesWeeklyTrend = [];
      for (let i = 0; i < 4; i += 1) {
        const weekStart = new Date(fourWeeksAgo);
        weekStart.setDate(fourWeeksAgo.getDate() + i * 7);
        const key = toDateKey(weekStart);
        salesWeeklyTrend.push({
          weekStart: key,
          label: toWeekLabel(weekStart),
          total: salesByWeek.get(key) || 0,
        });
      }

      const recentOrders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 7,
        include: { items: true, payment: true },
      });

      const recentTransactions = recentOrders.map((order) => {
        const payment = order.payment;
        let status = "Pending";
        let statusColor = "warning";
        if (payment?.status === "COMPLETED") {
          status = "Completed";
          statusColor = "primary";
        } else if (payment?.status === "FAILED") {
          status = "Failed";
          statusColor = "danger";
        }

        return {
          id: order.id,
          createdAt: order.createdAt,
          itemCount: order.items?.length || 0,
          amount: toNumber(order.totalLKR),
          status,
          statusColor,
          method: payment?.method || null,
        };
      });

      // --- Demand forecast ---------------------------------------------------
      // Pull the top products by recent activity, then run each through the
      // AI forecasting engine (heuristic today, ONNX when trained).  We build
      // sales history here rather than inside the AI route so the dashboard
      // can enrich predictions with live stock levels and thresholds.

      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: fourteenDaysAgo, lte: todayEnd } },
        },
        include: { product: true, order: true },
      });

      const sevenDaysBoundary = startOfDay(new Date(now.getTime()));
      sevenDaysBoundary.setDate(sevenDaysBoundary.getDate() - 6);

      // Accumulate recent/previous qty per product for trend calculation
      const forecastMap = new Map();
      for (const item of orderItems) {
        const existing = forecastMap.get(item.productId) || {
          productId: item.productId,
          name: item.product.name,
          stockQty: item.product.stockQty,
          threshold: item.product.reorderThreshold,
          recentQty: 0,
          previousQty: 0,
          salesHistory: [],
        };

        if (item.order.createdAt >= sevenDaysBoundary) {
          existing.recentQty += item.quantity;
        } else {
          existing.previousQty += item.quantity;
        }

        forecastMap.set(item.productId, existing);
      }

      // Top 5 most-active products
      const topEntries = Array.from(forecastMap.values())
        .sort((a, b) => b.recentQty - a.recentQty)
        .slice(0, 5);

      // Run AI predictions for the top products (non-blocking — falls back to
      // heuristic if the model isn't loaded; errors are swallowed inside
      // predictInventoryNeeds so the dashboard never breaks)
      const aiPredictions = await predictInventoryNeeds(
        topEntries.map((e) => ({ id: e.productId, salesHistory: e.salesHistory })),
      );
      const predictionById = new Map(
        aiPredictions.map((p) => [p.productId, p]),
      );

      const demandForecast = topEntries.map((entry) => {
        const prediction = predictionById.get(entry.productId);

        // Prefer AI trend when available, fall back to simple week-over-week
        let demandLabel;
        let recommendationResult;

        if (prediction) {
          demandLabel = prediction.trend === "increasing"
            ? `+${Math.round((prediction.point / Math.max(entry.recentQty, 1) - 1) * 100)}% Rise`
            : prediction.trend === "decreasing"
              ? `${Math.round((1 - prediction.point / Math.max(entry.recentQty, 1)) * 100)}% Drop`
              : "Stable";

          if (entry.stockQty <= entry.threshold) {
            recommendationResult = { recommendation: "REORDER NOW", color: "danger" };
          } else if (prediction.demandLevel === "high" || prediction.demandLevel === "very_high") {
            recommendationResult = { recommendation: "MONITOR", color: "warning" };
          } else {
            recommendationResult = { recommendation: "SUFFICIENT", color: "primary" };
          }
        } else {
          const change = entry.previousQty
            ? ((entry.recentQty - entry.previousQty) / entry.previousQty) * 100
            : entry.recentQty > 0 ? 100 : 0;
          demandLabel = formatDemand(change);
          recommendationResult = getRecommendation(change, entry.stockQty, entry.threshold);
        }

        // Stockout: how many days until this product runs out at forecasted demand
        let stockoutDays = null;
        if (prediction && prediction.point > 0) {
          stockoutDays = Math.round((entry.stockQty * 7) / prediction.point);
        } else if (!prediction && entry.recentQty > 0) {
          stockoutDays = Math.round((entry.stockQty * 7) / entry.recentQty);
        }

        // Restock: units needed to cover P90 demand + threshold buffer
        const restockQty = prediction && prediction.upper > 0
          ? Math.max(0, Math.ceil(prediction.upper + entry.threshold) - entry.stockQty)
          : 0;

        return {
          // LLM-compatible fields (used by getInsight prompt builder)
          product: entry.name,
          stock: `${entry.stockQty} Units`,
          demand: demandLabel,
          recommendation: recommendationResult.recommendation,
          color: recommendationResult.color,
          // Enriched fields for the UI
          productId: entry.productId,
          productName: entry.name,
          stockQty: entry.stockQty,
          reorderThreshold: entry.threshold,
          point: prediction?.point ?? 0,
          lower: prediction?.lower ?? 0,
          upper: prediction?.upper ?? 0,
          confidence: prediction?.confidence ?? 0,
          trend: prediction?.trend ?? "stable",
          demandLevel: prediction?.demandLevel ?? "low",
          demandLabel,
          stockoutDays,
          restockQty,
        };
      });

      // --- LLM insight narrative -------------------------------------------
      // getInsight() applies three cost-control gates before calling the API:
      //   1. Same data hash as last time  → return cache immediately
      //   2. Cache younger than MAX_AGE   → return cache
      //   3. No API key / offline         → return cache or null
      // The dashboard never waits on a slow API call: if the cache is warm the
      // response is instant; if the API call fails the last narrative is shown.

      const summaryForInsight = {
        todayRevenue: toNumber(todayRevenueAgg._sum.amountLKR),
        ordersToday: ordersTodayCount,
        lowStockItems: lowStockCount,
      };

      const insightResult = await getInsight(demandForecast, summaryForInsight);
      const aiInsight = insightResult?.narrative ?? null;

      res.json({
        status: "success",
        data: {
          summary: summaryForInsight,
          salesTrend,
          salesWeeklyTrend,
          paymentMethods: paymentMethodBreakdown,
          recentTransactions,
          demandForecast,
          reorderAlerts,
          aiInsight,
          aiInsightMeta: insightResult
            ? {
                fromCache: insightResult.fromCache,
                generatedAt: insightResult.generatedAt,
              }
            : null,
          aiApiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
