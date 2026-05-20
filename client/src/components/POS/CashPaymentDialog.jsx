import { useEffect, useMemo, useState } from "react";

const QUICK_DENOMINATIONS = [500, 1000, 2000, 5000];

function formatLkr(value) {
  return value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function roundUp(value, step) {
  return Math.ceil(value / step) * step;
}

export default function CashPaymentDialog({
  isOpen,
  total,
  onCancel,
  onConfirm,
  isProcessing = false,
}) {
  const [amountStr, setAmountStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountStr(total.toString());
    }
  }, [isOpen, total]);

  const amountPaid = useMemo(() => {
    const n = parseFloat(amountStr);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [amountStr]);

  const change = amountPaid - total;
  const isShort = change < 0;
  const isValid = !isShort && amountPaid > 0;

  // Suggest two extra denominations: the next note up from total (100/500/1000)
  // and the smallest standard note that covers it. Filter duplicates and the
  // exact-amount value.
  const suggestions = useMemo(() => {
    const candidates = new Set();
    [100, 500, 1000].forEach((step) => candidates.add(roundUp(total, step)));
    QUICK_DENOMINATIONS.forEach((d) => {
      if (d >= total) candidates.add(d);
    });
    return Array.from(candidates)
      .filter((v) => v > total)
      .sort((a, b) => a - b)
      .slice(0, 4);
  }, [total]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={isProcessing ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Cash Payment</h3>
          <button
            className="text-gray-500 hover:text-gray-800 text-xl leading-none disabled:opacity-50"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs uppercase text-gray-500 font-semibold">
              Total Due
            </p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              LKR {formatLkr(total)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid (LKR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              className="w-full text-2xl font-bold rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 tabular-nums"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid && !isProcessing) {
                  e.preventDefault();
                  onConfirm(amountPaid, change);
                }
              }}
              disabled={isProcessing}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAmountStr(total.toString())}
              disabled={isProcessing}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Exact
            </button>
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmountStr(q.toString())}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                LKR {q.toLocaleString("en-LK")}
              </button>
            ))}
          </div>

          <div
            className={`rounded-lg p-3 ${
              isShort ? "bg-red-50" : "bg-green-50"
            }`}
          >
            <p
              className={`text-xs uppercase font-semibold ${
                isShort ? "text-red-700" : "text-green-700"
              }`}
            >
              {isShort ? "Short" : "Change"}
            </p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                isShort ? "text-red-700" : "text-green-700"
              }`}
            >
              LKR {formatLkr(Math.abs(change))}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-50"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onConfirm(amountPaid, change)}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
