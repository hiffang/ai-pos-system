/**
 * Payment Handler Service
 * Processes payments for different methods: Cash, Card, Wallet, QR, Bank Transfer
 */
/** @type {import("@prisma/client").PrismaClient} */
const prisma = require("../db");
const { localWrite } = require("./syncEngine");

/**
 * @typedef {object} PaymentMetadata
 * @property {number} [changeLKR]
 * @property {string} [gatewayRef]
 * @property {string} [bankRef]
 * @property {string} [walletRef]
 * @property {string} [qrPayload]
 * @property {string} [customerName]
 */

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
 * Process a payment transaction
 * @param {string} orderId - Order ID to attach payment
 * @param {string} method - Payment method (cash, card, wallet, qr, banktransfer, credit)
 * @param {number} amount - Amount in LKR
 * @param {PaymentMetadata} metadata - Payment-specific metadata (e.g., gatewayRef, bankRef, changeLKR)
 * @returns {Promise<object>} - Payment transaction record
 */
async function processPayment(orderId, method, amount, metadata = {}) {
  try {
    if (!orderId) {
      throw createHttpError("Order ID is required", 400);
    }

    // Validate amount
    if (amount <= 0) {
      throw createHttpError("Payment amount must be greater than 0", 400);
    }

    const rawMethod = method ? method.toString().trim().toUpperCase() : "";
    const normalizedMethod = normalizePaymentMethod(method);
    if (!normalizedMethod) {
      console.warn("[processPayment] Invalid payment method received:", method);
      throw createHttpError(`Invalid payment method: ${method}`, 400);
    }

    if (rawMethod && rawMethod !== normalizedMethod) {
      console.warn(
        "[processPayment] Legacy payment method normalized:",
        method,
        "->",
        normalizedMethod,
      );
    }

    const customerName = metadata.customerName;

    /** @type {import("@prisma/client").PaymentStatus} */
    const paymentStatus = getInitialPaymentStatus(normalizedMethod);

    const payment = await localWrite({
      operation: "INSERT",
      entity: "Payment",
      write: (tx) =>
        tx.payment.create({
          data: {
            orderId,
            method: normalizedMethod,
            status: paymentStatus,
            amountLKR: amount,
            changeLKR: metadata?.changeLKR,
            gatewayRef: metadata?.gatewayRef,
            bankRef: metadata?.bankRef,
            walletRef: metadata?.walletRef,
            qrPayload: metadata?.qrPayload,
            customerName: customerName,
            ...(paymentStatus === "COMPLETED" && { settledAt: new Date() }),
          },
        }),
    });

    return payment;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[processPayment] Failed to process ${method} payment:`,
      message,
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
async function verifyPayHerePayment(paymentId, _signature) {
  try {
    // TODO: Implement PayHere webhook signature verification
    // For now, mark as verified (implement actual verification per PayHere docs)
    const payment = await prisma.payment.findFirst({
      where: { gatewayRef: paymentId },
    });

    if (!payment) {
      throw createHttpError("Payment not found", 404);
    }

    return await localWrite({
      operation: "UPDATE",
      entity: "Payment",
      write: (tx) =>
        tx.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED", settledAt: new Date() },
        }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[verifyPayHerePayment] Verification failed:", message);
    throw error;
  }
}

/**
 * Get initial payment status based on method
 * Some methods require verification, others are immediate
 * @param {string} method - Payment method
 * @returns {import("@prisma/client").PaymentStatus} - Initial status
 */
function getInitialPaymentStatus(method) {
  switch (method) {
    case "CASH":
      return "COMPLETED"; // Cash is immediate
    case "CARD":
    case "WALLET":
    case "QR":
      return "PENDING"; // Requires gateway verification
    case "BANK_TRANSFER":
      return "PENDING"; // Requires manual verification
    default:
      return "PENDING";
  }
}

/**
 * Normalize payment method to Prisma enum value
 * @param {string} method
 * @returns {import("@prisma/client").PaymentMethod | null}
 */
function normalizePaymentMethod(method) {
  if (!method) return null;
  const value = method.toString().trim().toLowerCase();
  switch (value) {
    case "cash":
      return "CASH";
    case "card":
    case "payherecard":
      return "CARD";
    case "wallet":
    case "payherewallet":
      return "WALLET";
    case "qr":
    case "onepay":
      return "QR";
    case "bank_transfer":
    case "banktransfer":
      return "BANK_TRANSFER";
    default:
      return null;
  }
}

/**
 * Refund a payment
 * @returns {Promise<never>} - Refund not implemented
 */
async function refundPayment() {
  throw createHttpError(
    "Refunds are not implemented in the current schema",
    501,
  );
}

module.exports = {
  processPayment,
  verifyPayHerePayment,
  refundPayment,
};
