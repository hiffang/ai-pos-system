/**
 * Shared sales-history builder used by both the demand-forecast routes and
 * the promotion-recommendation routes, so the dense per-day series logic
 * (zero-filled gaps included) lives in exactly one place.
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../../db");

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

module.exports = { buildSalesHistories };
