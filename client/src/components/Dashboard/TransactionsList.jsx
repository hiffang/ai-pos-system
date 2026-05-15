export default function TransactionsList({
  transactions = [],
  isLoading = false,
}) {
  const formatLkr = (amount) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatSignedLkr = (amount) =>
    amount < 0 ? `- ${formatLkr(Math.abs(amount))}` : formatLkr(amount);

  const getIconColor = (statusColor) => {
    switch (statusColor) {
      case "danger":
        return "text-danger";
      case "warning":
        return "text-secondary";
      default:
        return "text-primary";
    }
  };

  const getStatusClass = (statusColor) => {
    switch (statusColor) {
      case "danger":
        return "bg-danger/10 text-danger";
      case "warning":
        return "bg-warning/10 text-warning";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Failed":
        return "danger";
      case "Credit":
      case "Pending":
        return "warning";
      default:
        return "primary";
    }
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-h3 text-text-main">Recent Transactions</h3>
        <button className="text-xs font-bold text-primary hover:bg-primary-fixed-dim px-3 py-1 rounded transition-colors">
          View All
        </button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-110">
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <div className="px-6 py-6 text-sm text-text-muted">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-6 text-sm text-text-muted">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => {
              const statusColor = tx.statusColor || getStatusColor(tx.status);
              const icon =
                tx.status === "Credit"
                  ? "account_balance_wallet"
                  : statusColor === "danger"
                    ? "assignment_return"
                    : "receipt_long";

              return (
                <div
                  key={tx.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mr-4">
                      <span
                        className={`material-symbols-outlined ${getIconColor(statusColor)}`}
                      >
                        {icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">
                        {tx.id}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatTime(tx.createdAt)} • {tx.itemCount} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${statusColor === "danger" ? "text-danger" : "text-text-main"}`}
                    >
                      {formatSignedLkr(tx.amount || 0)}
                    </p>
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${getStatusClass(statusColor)}`}
                    >
                      {tx.status || "Pending"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
