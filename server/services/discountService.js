/**
 * Discount Service
 *
 * A product has at most one *active* discount at a time. "Active" means
 * active=true AND now is within [startDate, endDate] (endDate null = open-ended).
 * Enforced in app code, not the schema, since SQLite has no partial unique index.
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { localWrite } = require("./syncEngine");

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
 * @param {{ active: boolean, startDate: Date, endDate: Date | null }} discount
 * @param {Date} [now]
 */
function isCurrentlyActive(discount, now = new Date()) {
  if (!discount.active) return false;
  if (discount.startDate && new Date(discount.startDate) > now) return false;
  if (discount.endDate && new Date(discount.endDate) < now) return false;
  return true;
}

/**
 * @param {number} priceLKR
 * @param {{ type: string, value: unknown } | null | undefined} discount
 * @returns {number}
 */
function computeEffectivePrice(priceLKR, discount) {
  if (!discount) return priceLKR;
  const value = toNumber(discount.value);
  if (discount.type === "PERCENTAGE") {
    return Math.max(0, priceLKR * (1 - value / 100));
  }
  return Math.max(0, priceLKR - value);
}

/**
 * Fetch currently-active discounts for a set of products in one query.
 * @param {string[]} productIds
 * @returns {Promise<Map<string, import("@prisma/client").Discount>>}
 */
async function getActiveDiscountsMap(productIds) {
  /** @type {Map<string, import("@prisma/client").Discount>} */
  const map = new Map();
  if (productIds.length === 0) return map;

  const now = new Date();
  const candidates = await prisma.discount.findMany({
    where: {
      productId: { in: productIds },
      active: true,
      startDate: { lte: now },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const discount of candidates) {
    if (map.has(discount.productId)) continue; // keep most recent only
    if (isCurrentlyActive(discount, now)) {
      map.set(discount.productId, discount);
    }
  }
  return map;
}

/**
 * @param {{ priceLKR: unknown }} product
 * @param {import("@prisma/client").Discount | null | undefined} discount
 */
function attachDiscount(product, discount) {
  const priceLKR = toNumber(product.priceLKR);
  const effectivePriceLKR = discount
    ? computeEffectivePrice(priceLKR, discount)
    : priceLKR;
  return {
    ...product,
    effectivePriceLKR,
    discount: discount
      ? {
          id: discount.id,
          type: discount.type,
          value: toNumber(discount.value),
          reason: discount.reason,
          startDate: discount.startDate,
          endDate: discount.endDate,
        }
      : null,
  };
}

/**
 * Create a new active discount for a product, deactivating any prior active
 * discount for that same product first (transactionally).
 *
 * @param {{ productId: string, type: string, value: number, reason?: string, endDate?: string | null }} input
 */
async function createDiscount({ productId, type, value, reason, endDate }) {
  if (!productId) throw Object.assign(new Error("Product ID is required"), { statusCode: 400 });
  if (type !== "PERCENTAGE" && type !== "FIXED") {
    throw Object.assign(new Error('Type must be "PERCENTAGE" or "FIXED"'), { statusCode: 400 });
  }
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw Object.assign(new Error("Value must be a positive number"), { statusCode: 400 });
  }
  if (type === "PERCENTAGE" && parsedValue > 100) {
    throw Object.assign(new Error("Percentage discount cannot exceed 100"), { statusCode: 400 });
  }

  return localWrite({
    operation: "INSERT",
    entity: "Discount",
    write: async (tx) => {
      await tx.discount.updateMany({
        where: { productId, active: true },
        data: { active: false },
      });
      return tx.discount.create({
        data: {
          productId,
          type,
          value: parsedValue,
          reason: reason || null,
          ...(endDate && { endDate: new Date(endDate) }),
        },
      });
    },
  });
}

/**
 * Deactivate a discount (soft delete — keeps history).
 * @param {string} id
 */
async function removeDiscount(id) {
  return localWrite({
    operation: "UPDATE",
    entity: "Discount",
    write: (tx) =>
      tx.discount.update({
        where: { id },
        data: { active: false },
      }),
  });
}

module.exports = {
  toNumber,
  isCurrentlyActive,
  computeEffectivePrice,
  getActiveDiscountsMap,
  attachDiscount,
  createDiscount,
  removeDiscount,
};
