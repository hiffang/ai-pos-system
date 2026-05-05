/**
 * Payment Routes
 * Handles payment processing and verification
 */
const express = require("express");
const router = express.Router();
const {
  processPayment,
  verifyPayHerePayment,
} = require("../services/paymentHandler");

// POST /api/payments - Create a new payment
router.post("/", async (req, res, next) => {
  try {
    const { method, amount, customerId, metadata } = req.body;

    if (!method || !amount) {
      const error = new Error("Method and amount are required");
      error.statusCode = 400;
      throw error;
    }

    const payment = await processPayment(method, amount, customerId, metadata);
    res.status(201).json({
      status: "success",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/verify-payhereay - Verify PayHere payment
router.post("/verify-payhereay", async (req, res, next) => {
  try {
    const { paymentId, signature } = req.body;

    if (!paymentId || !signature) {
      const error = new Error("Payment ID and signature are required");
      error.statusCode = 400;
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
});

module.exports = router;
