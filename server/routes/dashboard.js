/**
 * Dashboard Routes
 * Provides aggregated metrics for the dashboard UI
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");

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
 */
function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {Date} date
 * @returns {string}
 */
function toWeekdayLabel(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
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

      const [
        todayRevenueAgg,
        ordersTodayCount,
        pendingCreditsAgg,
        pendingCreditsCount,
      ] = await prisma.$transaction([
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
        prisma.customerCredit.aggregate({
          where: { balanceLKR: { gt: 0 } },
          _sum: { balanceLKR: true },
        }),
        prisma.customerCredit.count({
          where: { balanceLKR: { gt: 0 } },
        }),
      ]);

      const lowStockProducts = await prisma.product.findMany({
        select: { stockQty: true, reorderThreshold: true },
      });
      const lowStockCount = lowStockProducts.filter(
        (product) => product.stockQty <= product.reorderThreshold,
      ).length;

      const paymentsByMethod = await prisma.payment.groupBy({
        by: ["method"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: sevenDaysAgo, lte: todayEnd },
        },
        _sum: { amountLKR: true },
        _count: true,
      });

      const paymentMethods = paymentsByMethod.map((entry) => {
        const amount = toNumber(entry._sum.amountLKR);
        return {
          method: entry.method,
          amount,
          count: entry._count,
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

      const recentOrders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 7,
        include: { items: true, payment: true },
      });

      const recentTransactions = recentOrders.map((order) => {
        const payment = order.payment;
        let status = "Pending";
        let statusColor = "warning";
        if (payment?.method === "CREDIT") {
          status = "Credit";
          statusColor = "warning";
        } else if (payment?.status === "COMPLETED") {
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

      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: { createdAt: { gte: fourteenDaysAgo, lte: todayEnd } },
        },
        include: { product: true, order: true },
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

      const demandForecast = Array.from(forecastMap.values())
        .sort((a, b) => b.recentQty - a.recentQty)
        .slice(0, 5)
        .map((entry) => {
          const change = entry.previousQty
            ? ((entry.recentQty - entry.previousQty) / entry.previousQty) * 100
            : entry.recentQty > 0
              ? 100
              : 0;
          const recommendation = getRecommendation(
            change,
            entry.stockQty,
            entry.threshold,
          );

          return {
            product: entry.name,
            stock: `${entry.stockQty} Units`,
            demand: formatDemand(change),
            recommendation: recommendation.recommendation,
            color: recommendation.color,
          };
        });

      const aiInsight = demandForecast.length
        ? `AI Insights: ${demandForecast[0].product} demand is trending up. Consider reordering soon.`
        : null;

      res.json({
        status: "success",
        data: {
          summary: {
            todayRevenue: toNumber(todayRevenueAgg._sum.amountLKR),
            ordersToday: ordersTodayCount,
            lowStockItems: lowStockCount,
            pendingCreditsTotal: toNumber(pendingCreditsAgg._sum.balanceLKR),
            pendingCreditsCount,
          },
          salesTrend,
          paymentMethods: paymentMethodBreakdown,
          recentTransactions,
          demandForecast,
          aiInsight,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
