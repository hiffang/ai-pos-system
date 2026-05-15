/**
 * Transactions Routes
 * Handles POS order operations
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { localWrite } = require("../services/syncEngine");

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
 * @param {string | import("qs").ParsedQs | (string | import("qs").ParsedQs)[] | undefined} value
 * @returns {string | undefined}
 */
function getQueryString(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * @param {string | import("qs").ParsedQs | (string | import("qs").ParsedQs)[] | undefined} value
 * @param {number} fallback
 */
function getQueryInt(value, fallback) {
  const raw = getQueryString(value);
  const parsed = raw ? parseInt(raw, 10) : fallback;
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * @param {string | import("qs").ParsedQs | (string | import("qs").ParsedQs)[] | undefined} value
 */
function getQueryDate(value) {
  const raw = getQueryString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * @param {string | string[] | undefined} value
 */
function getParamString(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

// GET /api/transactions - List orders
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { skip, take, startDate, endDate } = req.query;
      const parsedSkip = getQueryInt(skip, 0);
      const parsedTake = getQueryInt(take, 50);
      const startDateValue = getQueryDate(startDate);
      const endDateValue = getQueryDate(endDate);

      const orders = await prisma.order.findMany({
        where: {
          ...(startDateValue && { createdAt: { gte: startDateValue } }),
          ...(endDateValue && { createdAt: { lte: endDateValue } }),
        },
        skip: parsedSkip,
        take: parsedTake,
        include: { items: true, payment: true, user: true },
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.order.count({
        where: {
          ...(startDateValue && { createdAt: { gte: startDateValue } }),
          ...(endDateValue && { createdAt: { lte: endDateValue } }),
        },
      });

      res.json({
        status: "success",
        data: orders,
        pagination: { skip: parsedSkip, take: parsedTake, total },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/transactions/:id - Get single order
router.get(
  "/:id",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const orderId = getParamString(req.params.id);
      if (!orderId) {
        throw createHttpError("Order ID is required", 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true, user: true },
      });

      if (!order) {
        throw createHttpError("Order not found", 404);
      }

      res.json({
        status: "success",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/transactions - Create order
router.post(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { userId, items, total, totalLKR } = req.body;

      if (!items || items.length === 0) {
        throw createHttpError("Order must have items", 400);
      }

      if (!userId) {
        throw createHttpError("User ID is required", 400);
      }

      const totalValue = totalLKR ?? total;
      const computedTotal = items.reduce(
        (/** @type {number} */ sum, /** @type {any} */ item) => {
          const priceValue = item.unitPriceLKR ?? item.unitPrice ?? item.price;
          const qtyValue = item.quantity ?? 0;
          const parsedPrice =
            typeof priceValue === "string"
              ? parseFloat(priceValue)
              : priceValue;
          const parsedQty =
            typeof qtyValue === "string" ? parseInt(qtyValue, 10) : qtyValue;
          return (
            sum +
            (Number.isNaN(parsedPrice) ? 0 : parsedPrice) *
              (Number.isNaN(parsedQty) ? 0 : parsedQty)
          );
        },
        0,
      );

      const orderTotal =
        totalValue !== undefined && totalValue !== null
          ? parseFloat(totalValue)
          : computedTotal;

      const result = await localWrite({
        operation: "INSERT",
        entity: "Order",
        write: async (tx) => {
          const normalizedItems = items.map((/** @type {any} */ item) => ({
            productId: item.productId,
            quantity: parseInt(item.quantity, 10),
            unitPriceLKR: parseFloat(
              item.unitPriceLKR ?? item.unitPrice ?? item.price,
            ),
          }));

          /** @type {Array<{ productId: string, stockQty: number | null, delta: number }>} */
          const stockUpdates = [];

          const orderRecord = await tx.order.create({
            data: {
              userId,
              totalLKR: orderTotal,
              status: "PENDING",
              items: {
                create: normalizedItems.map((/** @type {any} */ item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPriceLKR: item.unitPriceLKR,
                })),
              },
            },
            include: { items: true },
          });

          for (const item of normalizedItems) {
            if (Number.isNaN(item.quantity) || item.quantity <= 0) {
              throw createHttpError(
                "Item quantity must be greater than 0",
                400,
              );
            }

            const stockUpdate = await tx.product.updateMany({
              where: {
                id: item.productId,
                stockQty: { gte: item.quantity },
              },
              data: { stockQty: { decrement: item.quantity } },
            });

            if (stockUpdate.count === 0) {
              throw createHttpError(
                "Insufficient stock for one or more items",
                400,
              );
            }

            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                qtyChange: -item.quantity,
                reason: `Sale ${orderRecord.id}`,
              },
            });

            const updatedProduct = await tx.product.findUnique({
              where: { id: item.productId },
              select: { id: true, stockQty: true },
            });

            stockUpdates.push({
              productId: item.productId,
              stockQty: updatedProduct?.stockQty ?? null,
              delta: -item.quantity,
            });
          }

          return { order: orderRecord, stockUpdates };
        },
        getEntityId: (result) => result.order.id,
        payload: (result) => result.order,
      });

      res.status(201).json({
        status: "success",
        data: result.order,
        stockUpdates: result.stockUpdates,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
