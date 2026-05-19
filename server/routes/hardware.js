/**
 * Hardware Routes
 * Receipt printing + cash drawer. Dispatches to the active printer adapter
 * via the printer registry. Printer failures are surfaced to the client but
 * never block the payment that already completed.
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const {
  printReceiptFromOrder,
  getPrinterStatus,
} = require("../services/hardware/printerRegistry");

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

// GET /api/hardware/printer/status
router.get(
  "/printer/status",
  (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      res.json({ status: "success", data: getPrinterStatus() });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/hardware/print-receipt - Print a receipt for an existing order
router.post(
  "/print-receipt",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        throw createHttpError("orderId is required", 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: { select: { name: true, sku: true } } } },
          payment: true,
          user: { select: { id: true, name: true, role: true } },
        },
      });
      if (!order) {
        throw createHttpError("Order not found", 404);
      }

      const result = await printReceiptFromOrder(order);

      res.json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
