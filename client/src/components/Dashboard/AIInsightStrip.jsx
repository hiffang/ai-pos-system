/**
 * AIInsightStrip
 *
 * Displays the cached LLM-generated insight narrative.
 * Shows a subtle "cached" badge when the insight was served from SQLite
 * rather than freshly generated, so managers know when it last updated.
 */

/**
 * @param {{
 *   message: string | null,
 *   isLoading?: boolean,
 *   meta?: { fromCache: boolean, generatedAt: string } | null
 * }} props
 */
export default function AIInsightStrip({ message, isLoading = false, meta = null }) {
  if (!isLoading && !message) return null;

  const generatedAt = meta?.generatedAt ? new Date(meta.generatedAt) : null;
  const timeLabel = generatedAt
    ? generatedAt.toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className="px-6 py-3 rounded flex items-center justify-between"
      style={{
        backgroundColor: "rgba(239, 159, 39, 0.1)",
        borderLeft: "4px solid #EF9F27",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Animated pulse dot */}
        <span className="relative flex-shrink-0 flex h-3 w-3">
          {!isLoading && (
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: "#EF9F27" }}
            />
          )}
          <span
            className="relative inline-flex rounded-full h-3 w-3"
            style={{ backgroundColor: "#EF9F27" }}
          />
        </span>

        {/* Narrative text — preserves line breaks from the API response */}
        <p
          className="text-sm font-medium whitespace-pre-line"
          style={{ color: "#EF9F27" }}
        >
          {isLoading ? "Loading AI insights..." : message}
        </p>
      </div>

      {/* Right side: cache badge + timestamp */}
      {!isLoading && message && (
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {meta?.fromCache && timeLabel && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "rgba(239, 159, 39, 0.15)",
                color: "#BA7517",
              }}
              title={`Insight generated at ${generatedAt?.toLocaleString("en-LK")}`}
            >
              cached · {timeLabel}
            </span>
          )}
          {!meta?.fromCache && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "rgba(29, 158, 117, 0.15)",
                color: "#0F6E56",
              }}
            >
              fresh
            </span>
          )}
        </div>
      )}
    </div>
  );
}
