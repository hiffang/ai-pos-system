import StatCard from "./StatCard";
import AIInsightStrip from "./AIInsightStrip";
import SalesChart from "./SalesChart";
import PaymentMethodChart from "./PaymentMethodChart";
import DemandForecastTable from "./DemandForecastTable";
import TransactionsList from "./TransactionsList";

export default function Dashboard() {
  const formatLkr = (amount) =>
    `LKR ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Real-time insights and performance metrics for your store.</p>
        </div>
      </div>

      {/* AI Insights Alert */}
      <AIInsightStrip />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatLkr(142500)}
          subtitle="+12.4% from yesterday"
          icon="trending_up"
          color="primary"
        />
        <StatCard
          title="Orders Today"
          value="84"
          subtitle="Avg 12 orders/hour"
          icon="schedule"
          color="text-main"
        />
        <StatCard
          title="Low Stock Items"
          value="12 Items"
          subtitle="Action required immediately"
          icon="warning"
          color="danger"
          bordered
        />
        <StatCard
          title="Pending Credits"
          value={formatLkr(42120)}
          subtitle="6 customers overdue"
          icon="account_balance"
          color="tertiary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <PaymentMethodChart />
      </div>

      {/* Forecast & Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
        <DemandForecastTable />
        <TransactionsList />
      </div>
    </div>
  );
}
