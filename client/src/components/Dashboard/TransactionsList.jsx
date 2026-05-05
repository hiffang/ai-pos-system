export default function TransactionsList() {
  const formatLkr = (amount) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatSignedLkr = (amount) =>
    amount < 0 ? `- ${formatLkr(Math.abs(amount))}` : formatLkr(amount);

  const transactions = [
    {
      id: "#INV-9402",
      time: "Today, 2:45 PM",
      items: "3 items",
      amount: 4500,
      status: "Completed",
      statusColor: "primary",
      icon: "receipt_long",
    },
    {
      id: "#INV-9401",
      time: "Today, 2:10 PM",
      items: "12 items",
      amount: 12250,
      status: "Credit",
      statusColor: "warning",
      icon: "account_balance_wallet",
    },
    {
      id: "#INV-9400",
      time: "Today, 1:30 PM",
      items: "1 item",
      amount: 280,
      status: "Completed",
      statusColor: "primary",
      icon: "receipt_long",
    },
    {
      id: "#INV-9399",
      time: "Today, 12:45 PM",
      items: "Refund",
      amount: -1200,
      status: "Returned",
      statusColor: "danger",
      icon: "assignment_return",
    },
    {
      id: "#INV-9398",
      time: "Today, 11:20 AM",
      items: "5 items",
      amount: 3450,
      status: "Completed",
      statusColor: "primary",
      icon: "receipt_long",
    },
    {
      id: "#INV-9397",
      time: "Today, 10:15 AM",
      items: "8 items",
      amount: 9800,
      status: "Completed",
      statusColor: "primary",
      icon: "receipt_long",
    },
    {
      id: "#INV-9396",
      time: "Today, 09:30 AM",
      items: "2 items",
      amount: 1100,
      status: "Completed",
      statusColor: "primary",
      icon: "receipt_long",
    },
  ];

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

  return (
    <div className="bg-surface rounded-xl shadow-sm flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-h3 text-text-main">Recent Transactions</h3>
        <button className="text-xs font-bold text-primary hover:bg-primary-fixed-dim px-3 py-1 rounded transition-colors">
          View All
        </button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[440px]">
        <div className="divide-y divide-gray-50">
          {transactions.map((tx, idx) => (
            <div
              key={idx}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center mr-4">
                  <span
                    className={`material-symbols-outlined ${getIconColor(tx.statusColor)}`}
                  >
                    {tx.icon}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-main">{tx.id}</p>
                  <p className="text-xs text-text-muted">
                    {tx.time} • {tx.items}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${tx.statusColor === "danger" ? "text-danger" : "text-text-main"}`}
                >
                  {formatSignedLkr(tx.amount)}
                </p>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${getStatusClass(tx.statusColor)}`}
                >
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
