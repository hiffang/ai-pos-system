import { useState, useEffect, useCallback } from "react";
import { fetchTransactions, fetchTransactionById } from "../store/apiClient";
import ReceiptModal from "../components/Dashboard/ReceiptModal";

const PAGE_SIZE = 20;

function StatusBadge({ status, statusColor }) {
  const color =
    statusColor === "danger"
      ? "bg-red-100 text-red-700"
      : statusColor === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${color}`}>
      {status || "Pending"}
    </span>
  );
}

function PaymentMethodLabel({ method }) {
  const labels = {
    CASH: "Cash",
    CARD: "Card",
    WALLET: "Wallet",
    QR: "LankaQR",
    BANK_TRANSFER: "Bank Transfer",
  };
  return <span>{labels[method] || method || "—"}</span>;
}

function normalizeTransaction(order) {
  const payment = order.payment;
  let status = "Pending";
  let statusColor = "warning";
  if (payment?.status === "COMPLETED") { status = "Completed"; statusColor = "primary"; }
  else if (payment?.status === "FAILED") { status = "Failed"; statusColor = "danger"; }

  const amount =
    typeof order.totalLKR === "object" && order.totalLKR !== null && "toNumber" in order.totalLKR
      ? order.totalLKR.toNumber()
      : Number(order.totalLKR ?? 0);

  return {
    id: order.id,
    createdAt: order.createdAt,
    cashier: order.user?.name ?? "—",
    itemCount: order.items?.length ?? 0,
    amount,
    status,
    statusColor,
    method: payment?.method ?? null,
  };
}

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ skip: 0, take: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(
    async (skip = 0) => {
      setLoading(true);
      const { data, pagination: pg } = await fetchTransactions({
        skip,
        take: PAGE_SIZE,
        ...(startDate && { startDate: new Date(startDate).toISOString() }),
        ...(endDate && { endDate: new Date(endDate + "T23:59:59").toISOString() }),
      });
      setRows(data.map(normalizeTransaction));
      setPagination(pg);
      setLoading(false);
    },
    [startDate, endDate],
  );

  useEffect(() => { load(0); }, [load]);

  const handleSelect = async (tx) => {
    setReceiptOpen(true);
    setReceipt(null);
    setReceiptLoading(true);
    const full = await fetchTransactionById(tx.id);
    setReceipt(full);
    setReceiptLoading(false);
  };

  const formatLkr = (n) =>
    `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (v) => {
    if (!v) return "—";
    return new Date(v).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
  };

  const page = Math.floor(pagination.skip / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(pagination.total / PAGE_SIZE);
  const from = pagination.total === 0 ? 0 : pagination.skip + 1;
  const to = Math.min(pagination.skip + PAGE_SIZE, pagination.total);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-sm text-gray-500 mt-0.5">All orders, most recent first.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(""); setEndDate(""); }}
            className="h-9 px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
        <p className="ml-auto text-xs text-gray-400">
          {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                rows.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => handleSelect(tx)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {tx.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tx.cashier}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {tx.itemCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatLkr(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <PaymentMethodLabel method={tx.method} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} statusColor={tx.statusColor} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {from}–{to} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(pagination.skip - PAGE_SIZE)}
                disabled={pagination.skip === 0 || loading}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => load(pagination.skip + PAGE_SIZE)}
                disabled={to >= pagination.total || loading}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {receiptOpen && (
        <ReceiptModal
          transaction={receipt}
          isLoading={receiptLoading}
          onClose={() => { setReceiptOpen(false); setReceipt(null); }}
        />
      )}
    </div>
  );
}
