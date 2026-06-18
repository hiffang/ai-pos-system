/**
 * ESC/POS adapter — drives thermal printers (Star, Epson, Bixolon, most
 * generic 58mm/80mm receipt printers) via the node-thermal-printer library.
 *
 * The library is lazy-required so the rest of the system runs (with the noop
 * adapter) even when the package isn't installed. To activate this adapter:
 *   1. npm install node-thermal-printer
 *   2. set printer.type = "escpos" in printerConfig.json
 *   3. set printer.interface to the printer URL (see config notes)
 */
const { formatTimestamp, formatLkr } = require("../receiptFormatter");

/** @type {any} */
let ThermalPrinter = null;
/** @type {any} */
let PrinterTypes = null;

function loadLibrary() {
  if (ThermalPrinter) return;
  try {
    const lib = require("node-thermal-printer");
    ThermalPrinter = lib.printer;
    PrinterTypes = lib.types;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ESC/POS adapter requires 'node-thermal-printer'. Install with: npm install node-thermal-printer. (${message})`,
    );
  }
}

const adapter = {
  type: "escpos",

  /**
   * @param {{ interface?: string, paperWidthChars?: number }} config
   */
  async load(config) {
    loadLibrary();
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: config.interface,
      width: config.paperWidthChars || 48,
      removeSpecialCharacters: false,
      lineCharacter: "-",
    });
    const connected = await printer.isPrinterConnected();
    if (!connected) {
      throw new Error(
        `ESC/POS printer not reachable at ${config.interface}`,
      );
    }
    return { printer };
  },

  /**
   * @param {import("../receiptFormatter").Receipt} receipt
   * @param {{ paperWidthChars?: number, openDrawer?: boolean }} config
   * @param {{ printer: any }} session
   */
  async print(receipt, config, session) {
    const { printer } = session;
    printer.clear();

    printer.alignCenter();
    printer.bold(true);
    printer.println(receipt.shop.name);
    printer.bold(false);
    if (receipt.shop.address) printer.println(receipt.shop.address);
    if (receipt.shop.phone) printer.println(receipt.shop.phone);
    printer.drawLine();

    printer.alignLeft();
    printer.tableCustom([
      { text: "Receipt", align: "LEFT", width: 0.5 },
      { text: receipt.receiptId.slice(0, 8), align: "RIGHT", width: 0.5 },
    ]);
    printer.tableCustom([
      { text: "Date", align: "LEFT", width: 0.4 },
      {
        text: formatTimestamp(receipt.timestamp),
        align: "RIGHT",
        width: 0.6,
      },
    ]);
    printer.tableCustom([
      { text: "Cashier", align: "LEFT", width: 0.4 },
      { text: receipt.cashier, align: "RIGHT", width: 0.6 },
    ]);
    printer.drawLine();

    for (const item of receipt.items) {
      printer.println(item.name);
      printer.tableCustom([
        {
          text: `  ${item.qty} x ${formatLkr(item.unitPrice)}`,
          align: "LEFT",
          width: 0.6,
        },
        {
          text: formatLkr(item.lineTotal),
          align: "RIGHT",
          width: 0.4,
        },
      ]);
    }

    printer.drawLine();
    printer.tableCustom([
      { text: "Subtotal", align: "LEFT", width: 0.6 },
      { text: `LKR ${formatLkr(receipt.subtotal)}`, align: "RIGHT", width: 0.4 },
    ]);
    printer.bold(true);
    printer.tableCustom([
      { text: "TOTAL", align: "LEFT", width: 0.6 },
      { text: `LKR ${formatLkr(receipt.total)}`, align: "RIGHT", width: 0.4 },
    ]);
    printer.bold(false);

    if (receipt.payment) {
      printer.drawLine();
      printer.tableCustom([
        { text: "Payment", align: "LEFT", width: 0.5 },
        { text: receipt.payment.methodLabel, align: "RIGHT", width: 0.5 },
      ]);
      printer.tableCustom([
        { text: "Paid", align: "LEFT", width: 0.5 },
        {
          text: `LKR ${formatLkr(receipt.payment.amountPaid)}`,
          align: "RIGHT",
          width: 0.5,
        },
      ]);
      if (receipt.payment.change !== null) {
        printer.tableCustom([
          { text: "Change", align: "LEFT", width: 0.5 },
          {
            text: `LKR ${formatLkr(receipt.payment.change)}`,
            align: "RIGHT",
            width: 0.5,
          },
        ]);
      }
    }

    printer.drawLine();
    if (receipt.shop.footer) {
      printer.alignCenter();
      printer.println(receipt.shop.footer);
    }
    printer.cut();
    if (config.openDrawer) {
      printer.openCashDrawer();
    }

    await printer.execute();
    return { ok: true };
  },

  status(session) {
    return { ready: !!session?.printer };
  },
};

module.exports = adapter;
