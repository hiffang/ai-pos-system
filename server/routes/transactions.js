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

// GET /api/transactions - List orders
router.get(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { skip = 0, take = 50, startDate, endDate } = req.query;

      const orders = await prisma.order.findMany({
        where: {
          ...(startDate && { createdAt: { gte: new Date(startDate) } }),
          ...(endDate && { createdAt: { lte: new Date(endDate) } }),
        },
        skip: parseInt(skip),
        take: parseInt(take),
        include: { items: true, payment: true, user: true },
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.order.count({
        where: {
          ...(startDate && { createdAt: { gte: new Date(startDate) } }),
          ...(endDate && { createdAt: { lte: new Date(endDate) } }),
        },
      });

      res.json({
        status: "success",
        data: orders,
        pagination: { skip: parseInt(skip), take: parseInt(take), total },
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
      const order = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true, payment: true, user: true },
      });

      if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
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
        const error = new Error("Order must have items");
        error.statusCode = 400;
        throw error;
      }

      if (!userId) {
        const error = new Error("User ID is required");
        error.statusCode = 400;
        throw error;
      }

      const totalValue = totalLKR ?? total;
      const computedTotal = items.reduce((sum, item) => {
        const priceValue = item.unitPriceLKR ?? item.unitPrice ?? item.price;
        const qtyValue = item.quantity ?? 0;
        const parsedPrice =
          typeof priceValue === "string" ? parseFloat(priceValue) : priceValue;
        const parsedQty =
          typeof qtyValue === "string" ? parseInt(qtyValue, 10) : qtyValue;
        return (
          sum +
          (Number.isNaN(parsedPrice) ? 0 : parsedPrice) *
            (Number.isNaN(parsedQty) ? 0 : parsedQty)
        );
      }, 0);

      const orderTotal =
        totalValue !== undefined && totalValue !== null
          ? parseFloat(totalValue)
          : computedTotal;

      const order = await localWrite({
        operation: "INSERT",
        entity: "Order",
        write: (tx) =>
          tx.order.create({
            data: {
              userId,
              totalLKR: orderTotal,
              status: "PENDING",
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPriceLKR: parseFloat(
                    item.unitPriceLKR ?? item.unitPrice ?? item.price,
                  ),
                })),
              },
            },
            include: { items: true },
          }),
      });

      res.status(201).json({
        status: "success",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
