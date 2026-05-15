export default function AIInsightStrip({ message, isLoading = false }) {
  if (!isLoading && !message) {
    return null;
  }

  return (
    <div
      className="px-6 py-3 rounded flex items-center justify-between"
      style={{
        backgroundColor: "rgba(239, 159, 39, 0.1)",
        borderLeft: "4px solid #EF9F27",
      }}
    >
      <div className="flex items-center">
        <span className="relative flex h-3 w-3 mr-4">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "#EF9F27" }}
          ></span>
          <span
            className="relative inline-flex rounded-full h-3 w-3"
            style={{ backgroundColor: "#EF9F27" }}
          ></span>
        </span>
        <p className="text-sm font-medium" style={{ color: "#EF9F27" }}>
          {isLoading ? "Loading AI insights..." : message}
        </p>
      </div>
      {message ? (
        <button
          className="text-xs font-bold uppercase tracking-widest hover:underline whitespace-nowrap ml-4"
          style={{ color: "#EF9F27" }}
        >
          View Forecast
        </button>
      ) : null}
    </div>
  );
}
