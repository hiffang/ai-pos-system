import { useEffect, useMemo, useState } from "react";
import {
  fetchCustomerCredits,
  adjustCustomerCreditBalance,
  createCustomerCredit,
  deleteCustomerCredit,
} from "../store/apiClient";

export default function CustomerCredit() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [removeOnZero, setRemoveOnZero] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customerName: "",
    phone: "",
    balanceLKR: "",
  });
  const [formError, setFormError] = useState("");

  const loadCustomers = async (searchValue = "") => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchCustomerCredits({ search: searchValue });
      setCustomers(data);
    } catch (err) {
      setError(err.message || "Failed to load customer credits");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const totalCredit = customers.reduce(
    (sum, c) => sum + Number(c.balanceLKR || 0),
    0,
  );
  const overdueCount = customers.filter(
    (c) => Number(c.balanceLKR || 0) > 5000,
  ).length;

  const filteredCustomers = useMemo(() => {
    if (filter === "OVERDUE") {
      return customers.filter((c) => Number(c.balanceLKR || 0) > 5000);
    }
    if (filter === "RECENT") {
      return customers.slice(0, 10);
    }
    return customers;
  }, [customers, filter]);

  const getInitialsColor = (initials) => {
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-pink-100 text-pink-700",
      "bg-yellow-100 text-yellow-700",
      "bg-blue-100 text-blue-700",
    ];
    return colors[initials.charCodeAt(0) % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return "--";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  const formatCurrency = (amount) => {
    return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-LK", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const handleAdjustBalance = (customer) => {
    const currentBalance = Number(customer.balanceLKR || 0);
    setActiveCustomer(customer);
    setAdjustAmount(currentBalance ? `-${currentBalance}` : "-");
    setFormError("");
    setRemoveOnZero(false);
    setIsAdjustOpen(true);
  };

  const handleConfirmAdjust = async () => {
    const parsed = parseFloat(adjustAmount);
    if (Number.isNaN(parsed)) {
      setFormError("Amount must be a number.");
      return;
    }

    try {
      const currentBalance = Number(activeCustomer.balanceLKR || 0);
      const nextBalance = currentBalance + parsed;

      await adjustCustomerCreditBalance(activeCustomer.id, parsed);
      if (removeOnZero && nextBalance <= 0) {
        await deleteCustomerCredit(activeCustomer.id);
      }
      setIsAdjustOpen(false);
      setActiveCustomer(null);
      setAdjustAmount("");
      setFormError("");
      await loadCustomers(searchTerm.trim());
    } catch (err) {
      setFormError(err.message || "Failed to adjust balance.");
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.customerName || !newCustomer.phone) {
      setFormError("Name and phone are required.");
      return;
    }

    const initialBalance = newCustomer.balanceLKR
      ? parseFloat(newCustomer.balanceLKR)
      : 0;

    if (Number.isNaN(initialBalance)) {
      setFormError("Opening balance must be a number.");
      return;
    }

    try {
      await createCustomerCredit({
        customerName: newCustomer.customerName,
        phone: newCustomer.phone,
        balanceLKR: initialBalance,
      });
      setIsAddOpen(false);
      setNewCustomer({ customerName: "", phone: "", balanceLKR: "" });
      setFormError("");
      await loadCustomers(searchTerm.trim());
    } catch (err) {
      setFormError(err.message || "Failed to create customer.");
    }
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
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            onClick={() => setIsAddOpen(true)}
          >
            <span className="material-symbols-outlined text-sm">
              person_add
            </span>
            Add Customer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
            <span className="material-symbols-outlined text-sm">download</span>
            Export Statement
          </button>
        </div>
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
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Search by name or phone"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="flex gap-2 text-sm text-gray-600">
              {["ALL", "OVERDUE", "RECENT"].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1 rounded ${
                    filter === tab
                      ? "bg-gray-100 text-gray-900"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setFilter(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading customer credits...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}

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
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getInitialsColor(getInitials(customer.customerName))}`}
                      >
                        {getInitials(customer.customerName)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {customer.customerName}
                        </p>
                        <p className="text-gray-600 text-xs">Credit Account</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-gray-700">{customer.phone}</td>
                  <td className="py-4">
                    <p
                      className={`font-semibold ${Number(customer.balanceLKR || 0) > 5000 ? "text-red-600" : "text-gray-900"}`}
                    >
                      {formatCurrency(Number(customer.balanceLKR || 0))}
                    </p>
                  </td>
                  <td className="py-4 text-gray-700">
                    {formatDate(customer.updatedAt)}
                  </td>
                  <td className="py-4">
                    <button
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm flex items-center gap-2"
                      onClick={() => handleAdjustBalance(customer)}
                    >
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

        <p className="text-sm text-gray-600 mt-4">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      </div>

      {isAdjustOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Adjust Balance
              </h3>
              <button
                className="material-symbols-outlined text-gray-500"
                onClick={() => setIsAdjustOpen(false)}
              >
                close
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {activeCustomer.customerName} ({activeCustomer.phone})
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Amount
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. -1500 or 500"
              value={adjustAmount}
              onChange={(event) => setAdjustAmount(event.target.value)}
            />
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={removeOnZero}
                onChange={(event) => setRemoveOnZero(event.target.checked)}
              />
              Remove customer when balance reaches 0
            </label>
            {formError ? (
              <p className="text-sm text-red-600 mt-3">{formError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setIsAdjustOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                onClick={handleConfirmAdjust}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Customer</h3>
              <button
                className="material-symbols-outlined text-gray-500"
                onClick={() => setIsAddOpen(false)}
              >
                close
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newCustomer.customerName}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newCustomer.phone}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Balance (LKR)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={newCustomer.balanceLKR}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      balanceLKR: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {formError ? (
              <p className="text-sm text-red-600 mt-3">{formError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                onClick={handleCreateCustomer}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Links Card */}
        <div className="relative bg-linear-to-br from-green-700 to-green-900 rounded-lg overflow-hidden text-white p-6 min-h-50 flex items-end">
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
