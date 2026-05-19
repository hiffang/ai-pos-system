const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  CARD: "Card",
  WALLET: "Wallet",
  QR: "LankaQR",
  BANK_TRANSFER: "Bank Transfer",
};

const PAYMENT_STATUS_STYLES = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
  QUEUED: "bg-blue-100 text-blue-700",
};

function formatLkr(value) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return "LKR 0.00";
  return `LKR ${num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReceiptModal({ transaction, isLoading, onClose }) {
  if (!transaction && !isLoading) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !transaction ? (
          <div className="p-8 text-center text-gray-500">
            Loading receipt...
          </div>
        ) : (
          <ReceiptBody transaction={transaction} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ReceiptBody({ transaction, onClose }) {
  const items = transaction.items || [];
  const payment = transaction.payment;
  const subtotal = items.reduce((sum, item) => {
    const price =
      typeof item.unitPriceLKR === "string"
        ? parseFloat(item.unitPriceLKR)
        : item.unitPriceLKR;
    return sum + (Number.isNaN(price) ? 0 : price) * (item.quantity || 0);
  }, 0);

  const paymentMethodLabel = payment
    ? PAYMENT_METHOD_LABELS[payment.method] || payment.method
    : "—";
  const paymentStatusClass = payment
    ? PAYMENT_STATUS_STYLES[payment.status] ||
      "bg-gray-100 text-gray-600"
    : "bg-gray-100 text-gray-600";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Receipt</h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {transaction.id}
          </p>
        </div>
        <button
          className="text-gray-500 hover:text-gray-800 text-xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-500 font-semibold">Date</p>
          <p className="text-gray-900">{formatDateTime(transaction.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500 font-semibold">Cashier</p>
          <p className="text-gray-900">
            {transaction.user?.name || transaction.userId || "—"}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase text-gray-500 font-semibold mb-2">
          Items
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No items.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {items.map((item) => {
              const unit =
                typeof item.unitPriceLKR === "string"
                  ? parseFloat(item.unitPriceLKR)
                  : item.unitPriceLKR;
              const safeUnit = Number.isNaN(unit) ? 0 : unit;
              const qty = item.quantity || 0;
              return (
                <div
                  key={item.id}
                  className="px-3 py-2 flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.product?.name || "Unknown product"}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {item.product?.sku || ""} · {qty} × {formatLkr(safeUnit)}
                    </p>
                  </div>
                  <p className="text-gray-900 font-semibold whitespace-nowrap">
                    {formatLkr(safeUnit * qty)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm border-t pt-3">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatLkr(subtotal)}</span>
        </div>
        <div className="flex justify-between font-bold text-base text-gray-900">
          <span>Total</span>
          <span>{formatLkr(transaction.totalLKR)}</span>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Payment</span>
          <span className="font-medium text-gray-900">{paymentMethodLabel}</span>
        </div>
        {payment ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <span
                className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${paymentStatusClass}`}
              >
                {payment.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount paid</span>
              <span className="text-gray-900">
                {formatLkr(payment.amountLKR)}
              </span>
            </div>
            {payment.changeLKR !== null && payment.changeLKR !== undefined ? (
              <div className="flex justify-between">
                <span className="text-gray-600">Change</span>
                <span className="text-gray-900">
                  {formatLkr(payment.changeLKR)}
                </span>
              </div>
            ) : null}
            {payment.gatewayRef ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Gateway ref</span>
                <span className="font-mono text-gray-700">
                  {payment.gatewayRef}
                </span>
              </div>
            ) : null}
            {payment.bankRef ? (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Bank ref</span>
                <span className="font-mono text-gray-700">
                  {payment.bankRef}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-gray-500">No payment recorded yet.</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
