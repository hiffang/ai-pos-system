export default function CustomerCredit() {
  const customers = [
    {
      id: 1,
      initials: "AK",
      name: "Amila Kulatunga",
      type: "Premium Member",
      phone: "+94 77 123 4567",
      balance: 12450,
      lastPurchase: "Oct 24, 2025",
    },
    {
      id: 2,
      initials: "DP",
      name: "Dinith Perera",
      type: "Regular Customer",
      phone: "+94 71 887 6543",
      balance: 2950,
      lastPurchase: "Oct 26, 2025",
    },
    {
      id: 3,
      initials: "SM",
      name: "Saman Menaka",
      type: "New Member",
      phone: "+94 76 555 4433",
      balance: 8920,
      lastPurchase: "Oct 25, 2025",
    },
    {
      id: 4,
      initials: "NJ",
      name: "Nimal Jayaweera",
      type: "VIP Account",
      phone: "+94 75 111 2222",
      balance: 4800,
      lastPurchase: "Oct 27, 2025",
    },
  ];

  const totalCredit = customers.reduce((sum, c) => sum + c.balance, 0);
  const overdueCount = customers.filter((c) => c.balance > 5000).length;

  const getInitialsColor = (initials) => {
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-yellow-100 text-yellow-700",
      "bg-blue-100 text-blue-700",
    ];
    return colors[initials.charCodeAt(0) % colors.length];
  };

  const formatCurrency = (amount) => {
    return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Alert Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-yellow-600 mt-0.5">
            warning
          </span>
          <div>
            <h3 className="font-semibold text-yellow-800">
              ⚠️ Insight: Three customers are approaching their credit limit
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Consider sending automated payment reminders to maintain healthy
              cash flow.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Accounts
          </h1>
          <p className="text-gray-600">
            Manage outstanding balances and credit history for your regular
            customers.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
          <span className="material-symbols-outlined text-sm">download</span>
          Export Statement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Total Outstanding Credit
              </p>
              <p className="text-3xl font-bold text-teal-600 mt-2">
                {formatCurrency(totalCredit)}
              </p>
              <p className="text-sm text-teal-600 mt-2">
                ↑ 12% increase from last month
              </p>
            </div>
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-4xl">
                account_balance_wallet
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
                Active Accounts
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {customers.length}
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ {overdueCount} accounts overdue
              </p>
            </div>
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400 text-4xl">
                people
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Directory */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Account Directory</h2>
          <div className="flex gap-2 text-sm text-gray-600">
            <button className="px-3 py-1 hover:bg-gray-100 rounded">ALL</button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">
              OVERDUE
            </button>
            <button className="px-3 py-1 hover:bg-gray-100 rounded">
              RECENT
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr className="text-left text-gray-600 font-semibold">
                <th className="pb-3">CUSTOMER DETAILS</th>
                <th className="pb-3">PHONE NUMBER</th>
                <th className="pb-3">OUTSTANDING BALANCE</th>
                <th className="pb-3">LAST PURCHASE</th>
                <th className="pb-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getInitialsColor(customer.initials)}`}
                      >
                        {customer.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {customer.name}
                        </p>
                        <p className="text-gray-600 text-xs">{customer.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-gray-700">{customer.phone}</td>
                  <td className="py-4">
                    <p
                      className={`font-semibold ${customer.balance > 5000 ? "text-red-600" : "text-gray-900"}`}
                    >
                      {formatCurrency(customer.balance)}
                    </p>
                  </td>
                  <td className="py-4 text-gray-700">
                    {customer.lastPurchase}
                  </td>
                  <td className="py-4">
                    <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center gap-2">
                      Settle Balance
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-600 mt-4">Showing 4 of 42 customers</p>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Links Card */}
        <div className="relative bg-gradient-to-br from-green-700 to-green-900 rounded-lg overflow-hidden text-white p-6 min-h-[200px] flex items-end">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'url(data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpath d="M50 10 L70 40 L50 70 L30 40 Z" fill="white" opacity="0.3"/%3E%3C/svg%3E)',
            }}
          ></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Send Payment Links</h3>
            <p className="text-green-100">
              Automate settlements by sending secure SMS payment links
            </p>
          </div>
        </div>

        {/* Credit Risk Analysis Card */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Credit Risk Analysis
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Generate a detailed report of aging balances and risk factors
                for better credit decisions.
              </p>
              <button className="text-teal-600 hover:text-teal-700 font-semibold text-sm flex items-center gap-2">
                Download Report (PDF)
                <span className="material-symbols-outlined text-sm">
                  download
                </span>
              </button>
            </div>
            <span className="material-symbols-outlined text-teal-600 text-4xl">
              analytics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
