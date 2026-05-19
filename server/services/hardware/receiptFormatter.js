/**
 * Receipt formatter — converts an Order (with items, payment, user) into
 * a structured receipt the printer adapters can render. Layout decisions
 * (column widths, alignment, paper wrapping) belong in the adapters.
 */

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

const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  CARD: "Card",
  WALLET: "Wallet",
  QR: "LankaQR",
  BANK_TRANSFER: "Bank Transfer",
};

/**
 * @typedef {Object} ReceiptShop
 * @property {string} name
 * @property {string=} address
 * @property {string=} phone
 * @property {string=} footer
 *
 * @typedef {Object} ReceiptLine
 * @property {string} name
 * @property {string=} sku
 * @property {number} qty
 * @property {number} unitPrice
 * @property {number} lineTotal
 *
 * @typedef {Object} Receipt
 * @property {ReceiptShop} shop
 * @property {string} receiptId
 * @property {Date} timestamp
 * @property {string} cashier
 * @property {ReceiptLine[]} items
 * @property {number} subtotal
 * @property {number} total
 * @property {Object|null} payment
 */

/**
 * @param {any} order  Full order from prisma.order.findUnique with items.product, payment, user
 * @param {ReceiptShop} shop
 * @returns {Receipt}
 */
function buildReceipt(order, shop) {
  const items = (order.items || []).map((item) => {
    const unitPrice = toNumber(item.unitPriceLKR);
    const qty = item.quantity || 0;
    return {
      name: item.product?.name || "Unknown product",
      sku: item.product?.sku || "",
      qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const payment = order.payment
    ? {
        method: order.payment.method,
        methodLabel:
          PAYMENT_METHOD_LABELS[order.payment.method] || order.payment.method,
        status: order.payment.status,
        amountPaid: toNumber(order.payment.amountLKR),
        change:
          order.payment.changeLKR !== null &&
          order.payment.changeLKR !== undefined
            ? toNumber(order.payment.changeLKR)
            : null,
        gatewayRef: order.payment.gatewayRef || null,
        bankRef: order.payment.bankRef || null,
      }
    : null;

  return {
    shop,
    receiptId: order.id,
    timestamp: order.createdAt ? new Date(order.createdAt) : new Date(),
    cashier: order.user?.name || order.userId || "—",
    items,
    subtotal,
    total: toNumber(order.totalLKR),
    payment,
  };
}

/**
 * @param {Date} d
 */
function formatTimestamp(d) {
  return d.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * @param {number} value
 */
function formatLkr(value) {
  return value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = {
  buildReceipt,
  formatTimestamp,
  formatLkr,
};
