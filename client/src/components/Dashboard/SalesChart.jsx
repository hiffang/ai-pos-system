import { useState } from "react";

const TITLES = {
  daily: "Sales This Week",
  weekly: "Sales — Last 4 Weeks",
};

const EMPTY_MESSAGES = {
  daily: "No sales activity for the past week.",
  weekly: "No sales activity for the past 4 weeks.",
};

export default function SalesChart({
  data = [],
  weeklyData = [],
  isLoading = false,
}) {
  const [interval, setInterval] = useState("daily");

  const activeData = interval === "weekly" ? weeklyData : data;
  const series = activeData.map((entry) => entry.total || 0);
  const labels = activeData.map((entry) => entry.label || "");
  const maxValue = Math.max(1, ...series);
  const hasData = series.some((value) => value > 0);

  const tabClass = (key) =>
    `text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
      interval === key
        ? "bg-primary text-white"
        : "bg-surface-container text-text-main hover:bg-surface-container-high"
    }`;

  return (
    <div className="bg-surface p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-h3 text-text-main">{TITLES[interval]}</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            className={tabClass("daily")}
            onClick={() => setInterval("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={tabClass("weekly")}
            onClick={() => setInterval("weekly")}
          >
            Weekly
          </button>
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
          {EMPTY_MESSAGES[interval]}
        </div>
      )}
    </div>
  );
}
