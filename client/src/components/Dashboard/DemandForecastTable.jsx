function TrendBadge({ trend }) {
  if (trend === "increasing")
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="material-symbols-outlined text-sm leading-none">trending_up</span>
        Rising
      </span>
    );
  if (trend === "decreasing")
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <span className="material-symbols-outlined text-sm leading-none">trending_down</span>
        Falling
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      <span className="material-symbols-outlined text-sm leading-none">trending_flat</span>
      Stable
    </span>
  );
}

function StockoutCell({ days }) {
  if (days === null || days === undefined)
    return <span className="text-xs text-gray-400">—</span>;
  if (days <= 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <span className="material-symbols-outlined text-sm leading-none">error</span>
        Out now
      </span>
    );
  if (days <= 7)
    return (
      <span className="text-xs font-semibold text-red-500">~{days}d</span>
    );
  if (days <= 14)
    return (
      <span className="text-xs font-medium text-amber-500">~{days}d</span>
    );
  if (days <= 30)
    return (
      <span className="text-xs text-gray-500">~{days}d</span>
    );
  return <span className="text-xs text-gray-400">30+ days</span>;
}

function RecommendationBadge({ recommendation }) {
  if (recommendation === "REORDER NOW")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <span className="material-symbols-outlined text-sm leading-none">warning</span>
        Reorder
      </span>
    );
  if (recommendation === "MONITOR")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <span className="material-symbols-outlined text-sm leading-none">visibility</span>
        Monitor
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <span className="material-symbols-outlined text-sm leading-none">check_circle</span>
      OK
    </span>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 70 ? "bg-[#1D9E75]" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400">{pct}%</span>
    </div>
  );
}

export default function DemandForecastTable({ forecasts = [], isLoading = false }) {
  // Detect whether we have enriched data (new format) or legacy strings
  const isEnriched = forecasts.length > 0 && "productId" in forecasts[0];

  return (
    <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-h3 text-text-main">AI Demand Forecast</h3>
          <p className="text-xs text-text-muted mt-1">7-day outlook for top active products</p>
        </div>
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>

      <div className="overflow-x-auto">
        {isEnriched ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3 text-right">Stockout</th>
                <th className="px-4 py-3 text-right">Restock</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td className="px-5 py-5 text-sm text-text-muted" colSpan={6}>
                    Loading forecast…
                  </td>
                </tr>
              ) : forecasts.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-sm text-text-muted" colSpan={6}>
                    No demand data yet — forecasts appear after the first sales.
                  </td>
                </tr>
              ) : (
                forecasts.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-900">{item.productName}</span>
                      <ConfidenceBar value={item.confidence} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          item.stockQty <= item.reorderThreshold
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        {item.stockQty}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">
                        / {item.reorderThreshold}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TrendBadge trend={item.trend} />
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.demandLabel}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <StockoutCell days={item.stockoutDays} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.restockQty > 0 ? (
                        <span className="text-xs font-medium text-gray-700">
                          {item.restockQty} units
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RecommendationBadge recommendation={item.recommendation} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          // Legacy fallback (plain strings from old API format)
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
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.color === "danger"
                            ? "bg-danger/10 text-danger"
                            : item.color === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {item.recommendation}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
