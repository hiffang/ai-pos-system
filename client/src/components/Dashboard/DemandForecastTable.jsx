export default function DemandForecastTable({
  forecasts = [],
  isLoading = false,
}) {
  const getColorClass = (color) => {
    switch (color) {
      case "danger":
        return "bg-danger/10 text-danger";
      case "warning":
        return "bg-warning/10 text-warning";
      case "primary":
        return "bg-primary/10 text-primary";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-h3 text-text-main">AI Demand Forecast</h3>
          <p className="text-xs text-text-muted mt-1">
            Predictions for the next 7 days
          </p>
        </div>
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-label-caps text-text-muted">
            <tr>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Current Stock</th>
              <th className="px-6 py-4">Predicted Demand</th>
              <th className="px-6 py-4 text-right">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-body-md">
            {isLoading ? (
              <tr>
                <td className="px-6 py-6 text-sm text-text-muted" colSpan={4}>
                  Loading demand forecast...
                </td>
              </tr>
            ) : forecasts.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-text-muted" colSpan={4}>
                  No demand forecast available yet.
                </td>
              </tr>
            ) : (
              forecasts.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold">{item.product}</td>
                  <td className="px-6 py-4">{item.stock}</td>
                  <td className="px-6 py-4 font-bold">{item.demand}</td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${getColorClass(item.color)}`}
                    >
                      {item.recommendation}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
