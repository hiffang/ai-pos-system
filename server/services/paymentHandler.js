/**
 * Payment Handler Service
 * Processes payments for different methods: Cash, PayHere, OnePay, Bank Transfer, Credit/Tab
 */
const prisma = require("../db");

/**
 * Process a payment transaction
 * @param {string} method - Payment method (cash, payherecard, payheewallet, onepay, banktransfer, credit)
 * @param {number} amount - Amount in LKR
 * @param {string} customerId - Customer ID (required for credit/tab)
 * @param {object} metadata - Payment-specific metadata (e.g., reference number, bank name)
 * @returns {Promise<object>} - Payment transaction record
 */
async function processPayment(
  method,
  amount,
  customerId = null,
  metadata = {},
) {
  try {
    // Validate amount
    if (amount <= 0) {
      const error = new Error("Payment amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    // Validate payment method
    const validMethods = [
      "cash",
      "payherecard",
      "payherewallet",
      "onepay",
      "banktransfer",
      "credit",
    ];
    if (!validMethods.includes(method)) {
      const error = new Error(`Invalid payment method: ${method}`);
      error.statusCode = 400;
      throw error;
    }

    // For credit/tab payments, validate customer
    if (method === "credit" && !customerId) {
      const error = new Error("Customer ID required for credit/tab payments");
      error.statusCode = 400;
      throw error;
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        method,
        amount,
        customerId,
        status: getInitialPaymentStatus(method),
        metadata,
        processedAt: new Date(),
      },
    });

    // For credit/tab, update customer credit balance
    if (method === "credit" && customerId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          creditBalance: {
            increment: amount,
          },
        },
      });
    }

    return payment;
  } catch (error) {
    console.error(
      `[processPayment] Failed to process ${method} payment:`,
      error,
    );
    throw error;
  }
}

/**
 * Verify a PayHere payment (callback from PayHere webhook)
 * @param {string} paymentId - PayHere payment ID
 * @param {string} signature - PayHere signature for verification
 * @returns {Promise<object>} - Verified payment record
 */
async function verifyPayHerePayment(paymentId, signature) {
  try {
    // TODO: Implement PayHere webhook signature verification
    // For now, mark as verified (implement actual verification per PayHere docs)
    const payment = await prisma.payment.findUnique({
      where: { externalPaymentId: paymentId },
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.statusCode = 404;
      throw error;
    }

    // Update payment status
    return await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "completed" },
    });
  } catch (error) {
    console.error("[verifyPayHerePayment] Verification failed:", error);
    throw error;
  }
}

/**
 * Get initial payment status based on method
 * Some methods require verification, others are immediate
 * @param {string} method - Payment method
 * @returns {string} - Initial status
 */
function getInitialPaymentStatus(method) {
  switch (method) {
    case "cash":
      return "completed"; // Cash is always immediate
    case "payherecard":
    case "payherewallet":
      return "pending"; // Requires PayHere verification
    case "onepay":
      return "pending"; // Requires OnePay verification
    case "banktransfer":
      return "pending"; // Requires manual verification
    case "credit":
      return "completed"; // Credit recorded immediately
    default:
      return "pending";
  }
}

/**
 * Refund a payment
 * @param {string} paymentId - Payment ID to refund
 * @param {string} reason - Refund reason
 * @returns {Promise<object>} - Refund record
 */
async function refundPayment(paymentId, reason = "") {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.statusCode = 404;
      throw error;
    }

    if (payment.status !== "completed") {
      const error = new Error("Only completed payments can be refunded");
      error.statusCode = 400;
      throw error;
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        reason,
        status: "pending",
      },
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "refunded" },
    });

    return refund;
  } catch (error) {
    console.error("[refundPayment] Refund failed:", error);
    throw error;
  }
}

module.exports = {
  processPayment,
  verifyPayHerePayment,
  refundPayment,
};
