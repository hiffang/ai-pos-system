/**
 * Payment Routes
 * Handles payment processing and verification
 */
/** @type {import("express")} */
const express = require("express");
const router = express.Router();
const {
  processPayment,
  verifyPayHerePayment,
} = require("../services/paymentHandler");

// POST /api/payments - Create a new payment
router.post(
  "/",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { orderId, method, amount, metadata } = req.body;

      if (!orderId || !method || !amount) {
        const error = new Error("Order ID, method, and amount are required");
        /** @type {any} */ (error).statusCode = 400;
        throw error;
      }

      const payment = await processPayment(orderId, method, amount, metadata);
      res.status(201).json({
        status: "success",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/payments/verify-payhereay - Verify PayHere payment
router.post(
  "/verify-payhereay",
  async (
    /** @type {import("express").Request} */ req,
    /** @type {import("express").Response} */ res,
    /** @type {import("express").NextFunction} */ next,
  ) => {
    try {
      const { paymentId, signature } = req.body;

      if (!paymentId || !signature) {
        const error = new Error("Payment ID and signature are required");
        /** @type {any} */ (error).statusCode = 400;
        throw error;
      }

      const payment = await verifyPayHerePayment(paymentId, signature);
      res.json({
        status: "success",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
