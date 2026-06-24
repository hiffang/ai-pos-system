import StatCard from "./StatCard";
import SalesChart from "./SalesChart";
import PaymentMethodChart from "./PaymentMethodChart";
import DemandForecastTable from "./DemandForecastTable";
import TransactionsList from "./TransactionsList";
import ReceiptModal from "./ReceiptModal";
import {
  fetchDashboardOverview,
  fetchTransactionById,
  refreshInsight,
} from "../../store/apiClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

function RelativeTime({ date }) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (mins < 1) return <span title={new Date(date).toLocaleString()}>just now</span>;
  if (mins < 60) return <span title={new Date(date).toLocaleString()}>{mins}m ago</span>;
  if (hrs < 24) return <span title={new Date(date).toLocaleString()}>{hrs}h ago</span>;
  return (
    <span title={new Date(date).toLocaleString()}>
      {new Date(date).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const handleSelectTransaction = useCallback(async (tx) => {
    if (!tx?.id) return;
    setReceiptOpen(true);
    setReceipt(null);
    setReceiptLoading(true);
    const full = await fetchTransactionById(tx.id);
    setReceipt(full);
    setReceiptLoading(false);
  }, []);

  const handleCloseReceipt = useCallback(() => {
    setReceiptOpen(false);
    setReceipt(null);
    setReceiptLoading(false);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadOverview = async () => {
      setIsLoading(true);
      const data = await fetchDashboardOverview();
      if (isActive) {
        setOverview(data || {});
        setIsLoading(false);
      }
    };
    loadOverview();
    return () => { isActive = false; };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing || Date.now() < cooldownUntil) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const result = await refreshInsight();
      if (result) {
        setOverview((prev) => ({
          ...prev,
          aiInsight: result.text,
          aiInsightMeta: { fromCache: result.fromCache, generatedAt: result.generatedAt },
        }));
        setCooldownUntil(Date.now() + REFRESH_COOLDOWN_MS);
      }
    } catch (err) {
      if (err.retryAfterSeconds) {
        setCooldownUntil(Date.now() + err.retryAfterSeconds * 1000);
      }
      setRefreshError(err?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, cooldownUntil]);

  const formatLkr = (amount) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const summary = useMemo(
    () => overview?.summary || { todayRevenue: 0, ordersToday: 0, lowStockItems: 0 },
    [overview],
  );

  const isCoolingDown = Date.now() < cooldownUntil;
  const apiKeyConfigured = overview?.aiApiKeyConfigured ?? false;
  const reorderAlerts = overview?.reorderAlerts ?? [];
  const aiInsight = overview?.aiInsight ?? null;
  const aiInsightMeta = overview?.aiInsightMeta ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Real-time insights and performance metrics for your store.</p>
        </div>
      </div>

      {/* AI Narrative card */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#EF9F27] shrink-0">auto_awesome</span>
            <h2 className="font-semibold text-gray-900">AI Business Insight</h2>
            {aiInsightMeta && (
              <span className="hidden sm:block text-xs text-gray-400 ml-2">
                <RelativeTime date={aiInsightMeta.generatedAt} />
                {aiInsightMeta.fromCache && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                    cached
                  </span>
                )}
                {!aiInsightMeta.fromCache && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px]">
                    fresh
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || isCoolingDown || !apiKeyConfigured || isLoading}
            title={
              !apiKeyConfigured
                ? "Set ANTHROPIC_API_KEY in .env to enable AI generation"
                : isCoolingDown
                  ? "Please wait before refreshing again"
                  : "Generate a fresh insight from Claude AI"
            }
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-sm leading-none ${refreshing ? "animate-spin" : ""}`}>
              {refreshing ? "progress_activity" : "refresh"}
            </span>
            {refreshing ? "Generating…" : "Refresh"}
          </button>
        </div>

        {refreshError && (
          <p className="mt-2 text-xs text-red-500">{refreshError}</p>
        )}

        <div className="mt-3 pl-7">
          {isLoading ? (
            <p className="text-sm text-gray-400 animate-pulse">Loading AI insight…</p>
          ) : aiInsight ? (
            <div className="space-y-1.5">
              {aiInsight.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {apiKeyConfigured
                ? "No insight yet — click Refresh to generate one."
                : "Set ANTHROPIC_API_KEY in your .env to enable AI-generated narratives."}
            </p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatLkr(summary.todayRevenue || 0)}
          subtitle={summary.todayRevenue > 0 ? "Revenue from completed payments" : "No revenue recorded yet"}
          icon="trending_up"
          color="primary"
        />
        <StatCard
          title="Orders Today"
          value={`${summary.ordersToday}`}
          subtitle={summary.ordersToday > 0 ? "Total orders today" : "No orders yet"}
          icon="schedule"
          color="text-main"
        />
        <StatCard
          title="Low Stock Items"
          value={`${summary.lowStockItems} Items`}
          subtitle={summary.lowStockItems > 0 ? "Action required immediately" : "Stock levels are healthy"}
          icon={summary.lowStockItems > 0 ? "warning" : "inventory_2"}
          color={summary.lowStockItems > 0 ? "danger" : "primary"}
          bordered={summary.lowStockItems > 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart
            data={overview?.salesTrend || []}
            weeklyData={overview?.salesWeeklyTrend || []}
            isLoading={isLoading}
          />
        </div>
        <PaymentMethodChart methods={overview?.paymentMethods || []} isLoading={isLoading} />
      </div>

      {/* Reorder alerts */}
      {!isLoading && reorderAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
            <span className="font-semibold text-red-700 text-sm">
              {reorderAlerts.length} product{reorderAlerts.length > 1 ? "s" : ""} need immediate restocking
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {reorderAlerts.map((p) => (
              <div
                key={p.productId}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-red-200 rounded-full text-xs"
              >
                <span className="font-medium text-gray-800">{p.productName}</span>
                <span className="text-red-500">{p.stockQty} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demand forecast — full width so the 6-column table has room */}
      <DemandForecastTable forecasts={overview?.demandForecast || []} isLoading={isLoading} />

      {/* Recent transactions */}
      <div className="pb-8">
        <TransactionsList
          transactions={overview?.recentTransactions || []}
          isLoading={isLoading}
          onSelect={handleSelectTransaction}
          onViewAll={() => navigate("/transactions")}
        />
      </div>

      {receiptOpen ? (
        <ReceiptModal transaction={receipt} isLoading={receiptLoading} onClose={handleCloseReceipt} />
      ) : null}
    </div>
  );
}
