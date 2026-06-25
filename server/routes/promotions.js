/**
 * Promotion Recommendation Routes
 *
 * Read-only AI-driven suggestions for what to put on promotion:
 *   - /overstock: products with demand far below current stock levels
 *   - /basket: products frequently bought together (market basket analysis)
 * Neither endpoint creates discounts — see routes/discounts.js for that.
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { predictInventoryNeeds } = require("../services/aiInference");
const { buildSalesHistories } = require("../services/ai/salesHistory");
const { computeFrequentPairs } = require("../services/ai/marketBasket");
const { getActiveDiscountsMap } = require("../services/discountService");

const HISTORY_DAYS = 28;
const MAX_CANDIDATES = 200;
const MIN_OVERSTOCK_RATIO = 2;
const DEFAULT_LIMIT = 15;
// Forecast point of 0 would make the ratio infinite — floor it so "dead
// stock" (no recent sales at all) still ranks highest without dividing by zero.
const POINT_FLOOR = 0.5;

// GET /api/promotions/overstock — low demand + high stock candidates
router.get("/overstock", async (req, res, next) => {
  try {
    // SQLite/Prisma can't compare two columns in a `where` clause, so fetch
    // and filter stockQty > reorderThreshold in JS.
    const candidates = await prisma.product.findMany({
      select: { id: true, name: true, stockQty: true, reorderThreshold: true },
      take: MAX_CANDIDATES,
    });
    const overstocked = candidates.filter((p) => p.stockQty > p.reorderThreshold);
    if (overstocked.length === 0) {
      return res.json({ status: "success", data: [] });
    }

    const discountMap = await getActiveDiscountsMap(overstocked.map((p) => p.id));
    const undiscounted = overstocked.filter((p) => !discountMap.has(p.id));
    if (undiscounted.length === 0) {
      return res.json({ status: "success", data: [] });
    }

    const histories = await buildSalesHistories(
      undiscounted.map((p) => p.id),
      HISTORY_DAYS,
    );
    const predictions = await predictInventoryNeeds(
      undiscounted.map((p) => ({ id: p.id, salesHistory: histories.get(p.id) || [] })),
    );
    const predictionById = new Map(predictions.map((p) => [p.productId, p]));

    const scored = undiscounted
      .map((product) => {
        const prediction = predictionById.get(product.id);
        const point = prediction?.point ?? 0;
        const ratio = product.stockQty / Math.max(point, POINT_FLOOR);
        const dailyPace = Math.max(point / 7, 0.05);
        const daysOfStock = Math.round(product.stockQty / dailyPace);
        return {
          productId: product.id,
          productName: product.name,
          stockQty: product.stockQty,
          reorderThreshold: product.reorderThreshold,
          point,
          demandLevel: prediction?.demandLevel ?? "very_low",
          trend: prediction?.trend ?? "stable",
          overstockRatio: Math.round(ratio * 10) / 10,
          daysOfStock,
        };
      })
      .filter((entry) => entry.overstockRatio >= MIN_OVERSTOCK_RATIO)
      .sort((a, b) => b.overstockRatio - a.overstockRatio)
      .slice(0, DEFAULT_LIMIT);

    res.json({ status: "success", data: scored });
  } catch (error) {
    next(error);
  }
});

// GET /api/promotions/basket — frequently bought together pairs
router.get("/basket", async (req, res, next) => {
  try {
    const pairs = await computeFrequentPairs();
    res.json({ status: "success", data: pairs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
