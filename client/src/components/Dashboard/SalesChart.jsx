export default function SalesChart({ data = [], isLoading = false }) {
  const series = data.map((entry) => entry.total || 0);
  const labels = data.map((entry) => entry.label || "");
  const maxValue = Math.max(1, ...series);
  const hasData = series.some((value) => value > 0);

  return (
    <div className="bg-surface p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-h3 text-text-main">Sales This Week</h3>
        <div className="flex space-x-2">
          <span className="text-xs bg-surface-container px-2 py-1 rounded">
            Daily
          </span>
          <span className="text-xs bg-primary text-white px-2 py-1 rounded">
            Weekly
          </span>
        </div>
      </div>
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-sm text-text-muted">
          Loading sales trend...
        </div>
      ) : hasData ? (
        <>
          <div className="h-64 flex items-end justify-between px-4 pb-4 gap-2">
            {series.map((value, idx) => (
              <div
                key={idx}
                className="flex-1 bg-primary rounded-t-lg transition-all hover:opacity-80"
                style={{
                  height: `${(value / maxValue) * 100}%`,
                  opacity: 0.3 + (value / maxValue) * 0.7,
                }}
                title={`LKR ${value.toLocaleString("en-LK")}`}
              />
            ))}
          </div>
          <div className="flex justify-between px-4 mt-2 text-xs text-text-muted font-semibold">
            {labels.map((label, idx) => (
              <span key={idx}>{label || "-"}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-text-muted">
          No sales activity for the past week.
        </div>
      )}
    </div>
  );
}
