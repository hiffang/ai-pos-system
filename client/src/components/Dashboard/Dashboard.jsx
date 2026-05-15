import StatCard from "./StatCard";
import AIInsightStrip from "./AIInsightStrip";
import SalesChart from "./SalesChart";
import PaymentMethodChart from "./PaymentMethodChart";
import DemandForecastTable from "./DemandForecastTable";
import TransactionsList from "./TransactionsList";
import { fetchDashboardOverview } from "../../store/apiClient";
import { useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

    return () => {
      isActive = false;
    };
  }, []);

  const formatLkr = (amount) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const summary = useMemo(() => {
    return (
      overview?.summary || {
        todayRevenue: 0,
        ordersToday: 0,
        lowStockItems: 0,
        pendingCreditsTotal: 0,
        pendingCreditsCount: 0,
      }
    );
  }, [overview]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Real-time insights and performance metrics for your store.
          </p>
        </div>
      </div>

      {/* AI Insights Alert */}
      <AIInsightStrip message={overview?.aiInsight} isLoading={isLoading} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatLkr(summary.todayRevenue || 0)}
          subtitle={
            summary.todayRevenue > 0
              ? "Revenue from completed payments"
              : "No revenue recorded yet"
          }
          icon="trending_up"
          color="primary"
        />
        <StatCard
          title="Orders Today"
          value={`${summary.ordersToday}`}
          subtitle={
            summary.ordersToday > 0 ? "Total orders today" : "No orders yet"
          }
          icon="schedule"
          color="text-main"
        />
        <StatCard
          title="Low Stock Items"
          value={`${summary.lowStockItems} Items`}
          subtitle={
            summary.lowStockItems > 0
              ? "Action required immediately"
              : "Stock levels are healthy"
          }
          icon="warning"
          color="danger"
          bordered
        />
        <StatCard
          title="Pending Credits"
          value={formatLkr(summary.pendingCreditsTotal || 0)}
          subtitle={
            summary.pendingCreditsCount > 0
              ? `${summary.pendingCreditsCount} customers overdue`
              : "No outstanding credits"
          }
          icon="account_balance"
          color="tertiary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={overview?.salesTrend || []} isLoading={isLoading} />
        </div>
        <PaymentMethodChart
          methods={overview?.paymentMethods || []}
          isLoading={isLoading}
        />
      </div>

      {/* Forecast & Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
        <DemandForecastTable
          forecasts={overview?.demandForecast || []}
          isLoading={isLoading}
        />
        <TransactionsList
          transactions={overview?.recentTransactions || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
