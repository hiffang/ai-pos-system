/**
 * No-op printer adapter — renders the receipt to the server console as
 * monospace text. Used in development and as a safe fallback when no
 * physical printer is configured. Never throws on connection issues.
 */
const { formatTimestamp, formatLkr } = require("../receiptFormatter");

/**
 * @param {string} s
 * @param {number} width
 */
function center(s, width) {
  if (s.length >= width) return s.slice(0, width);
  const left = Math.floor((width - s.length) / 2);
  return " ".repeat(left) + s;
}

/**
 * @param {string} left
 * @param {string} right
 * @param {number} width
 */
function spread(left, right, width) {
  const gap = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

const adapter = {
  type: "noop",

  async load() {
    return {};
  },

  /**
   * @param {import("../receiptFormatter").Receipt} receipt
   * @param {{ paperWidthChars?: number, openDrawer?: boolean }} config
   */
  async print(receipt, config) {
    const width = config.paperWidthChars || 48;
    const line = "-".repeat(width);
    const lines = [];

    lines.push(line);
    lines.push(center(receipt.shop.name.toUpperCase(), width));
    if (receipt.shop.address) lines.push(center(receipt.shop.address, width));
    if (receipt.shop.phone) lines.push(center(receipt.shop.phone, width));
    lines.push(line);
    lines.push(spread("Receipt", receipt.receiptId.slice(0, 8), width));
    lines.push(spread("Date", formatTimestamp(receipt.timestamp), width));
    lines.push(spread("Cashier", receipt.cashier, width));
    lines.push(line);

    for (const item of receipt.items) {
      lines.push(item.name.slice(0, width));
      const qtyLine = `  ${item.qty} x ${formatLkr(item.unitPrice)}`;
      lines.push(spread(qtyLine, formatLkr(item.lineTotal), width));
    }

    lines.push(line);
    lines.push(spread("Subtotal", `LKR ${formatLkr(receipt.subtotal)}`, width));
    lines.push(spread("TOTAL", `LKR ${formatLkr(receipt.total)}`, width));

    if (receipt.payment) {
      lines.push(line);
      lines.push(spread("Payment", receipt.payment.methodLabel, width));
      lines.push(
        spread("Paid", `LKR ${formatLkr(receipt.payment.amountPaid)}`, width),
      );
      if (receipt.payment.change !== null) {
        lines.push(
          spread("Change", `LKR ${formatLkr(receipt.payment.change)}`, width),
        );
      }
    }

    lines.push(line);
    if (receipt.shop.footer) lines.push(center(receipt.shop.footer, width));
    lines.push(line);

    console.log("\n[Printer:noop] Receipt output:\n" + lines.join("\n") + "\n");
    if (config.openDrawer) {
      console.log("[Printer:noop] (would fire cash drawer open)");
    }
    return { ok: true, lines: lines.length };
  },

  status() {
    return { ready: true, message: "noop adapter (no physical printer)" };
  },
};

module.exports = adapter;
