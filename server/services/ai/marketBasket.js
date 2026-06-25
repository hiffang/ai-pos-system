/**
 * Market Basket Analysis
 *
 * Finds products frequently bought together using simple co-occurrence /
 * association-rule metrics (support, confidence, lift) — no external ML
 * library needed at this catalog/order scale.
 *
 * This is insight-only: it surfaces pairs for a manager to act on manually
 * (e.g. discount one or both items). It does not enforce a bundle rule at
 * checkout.
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../../db");

const DEFAULT_WINDOW_DAYS = 90;
const DEFAULT_MIN_SUPPORT_COUNT = 2;
const DEFAULT_LIMIT = 10;

/**
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * @param {{ windowDays?: number, minSupportCount?: number, limit?: number }} [options]
 * @returns {Promise<Array<{
 *   productA: string, productAName: string,
 *   productB: string, productBName: string,
 *   pairCount: number, totalOrders: number,
 *   confidenceAtoB: number, confidenceBtoA: number, lift: number
 * }>>}
 */
async function computeFrequentPairs(options = {}) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const minSupportCount = options.minSupportCount ?? DEFAULT_MIN_SUPPORT_COUNT;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - windowDays);

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since } } },
    select: { orderId: true, productId: true },
  });

  if (items.length === 0) return [];

  /** @type {Map<string, Set<string>>} */
  const orderProducts = new Map();
  for (const item of items) {
    const set = orderProducts.get(item.orderId) || new Set();
    set.add(item.productId);
    orderProducts.set(item.orderId, set);
  }

  const totalOrders = orderProducts.size;
  /** @type {Map<string, number>} */
  const productOrderCount = new Map();
  /** @type {Map<string, number>} */
  const pairCount = new Map();

  for (const productSet of orderProducts.values()) {
    const products = Array.from(productSet);
    for (const p of products) {
      productOrderCount.set(p, (productOrderCount.get(p) || 0) + 1);
    }
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const key = pairKey(products[i], products[j]);
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  /** @type {Array<{ a: string, b: string, count: number }>} */
  const candidates = [];
  for (const [key, count] of pairCount.entries()) {
    if (count < minSupportCount) continue;
    const [a, b] = key.split("|");
    candidates.push({ a, b, count });
  }

  if (candidates.length === 0) return [];

  const involvedIds = new Set();
  for (const c of candidates) {
    involvedIds.add(c.a);
    involvedIds.add(c.b);
  }
  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(involvedIds) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  const results = candidates.map((c) => {
    const countA = productOrderCount.get(c.a) || 1;
    const countB = productOrderCount.get(c.b) || 1;
    const supportPair = c.count / totalOrders;
    const supportA = countA / totalOrders;
    const supportB = countB / totalOrders;
    const lift = supportPair / (supportA * supportB);

    return {
      productA: c.a,
      productAName: nameById.get(c.a) || "Unknown",
      productB: c.b,
      productBName: nameById.get(c.b) || "Unknown",
      pairCount: c.count,
      totalOrders,
      confidenceAtoB: c.count / countA,
      confidenceBtoA: c.count / countB,
      lift,
    };
  });

  results.sort((x, y) => y.lift - x.lift || y.pairCount - x.pairCount);
  return results.slice(0, limit);
}

module.exports = { computeFrequentPairs };
