import { useCallback, useEffect, useState } from "react";
import { getServerHealth } from "../../store/apiClient";

function formatTimestamp(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatDatabase(database) {
  if (!database) return "Unknown";
  if (database.location) return database.location;
  if (database.host) {
    return database.database
      ? `${database.host}/${database.database}`
      : database.host;
  }
  return "Unknown";
}

export default function DiagnosticsSection() {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const data = await getServerHealth();
    if (data?.status === "offline") {
      setErrorMessage("Server unreachable.");
    }
    setHealth(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const apiStatus = health?.status === "ok" ? "Online" : "Offline";
  const envLabel = health?.environment || "Unknown";
  const database = health?.database || null;
  const ai = health?.aiModelStatus || {};
  const sync = health?.syncStatus || {};
  const printer = health?.printerStatus || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Diagnostics</h2>
          <p className="text-gray-600">
            Health checks and runtime status for support and field debugging.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHealth}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
        >
          Refresh
        </button>
      </div>

      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">API</h3>
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold text-gray-900">{apiStatus}</span>
          </p>
          <p className="text-sm text-gray-600">
            Environment: <span className="font-semibold text-gray-900">{envLabel}</span>
          </p>
          <p className="text-sm text-gray-600">
            Timestamp: <span className="font-semibold text-gray-900">{formatTimestamp(health?.timestamp)}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Database</h3>
          <p className="text-sm text-gray-600">
            Provider: <span className="font-semibold text-gray-900">{database?.provider || "Unknown"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Location: <span className="font-semibold text-gray-900">{formatDatabase(database)}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">AI Model</h3>
          <p className="text-sm text-gray-600">
            Loaded: <span className="font-semibold text-gray-900">{ai.loaded ? "Yes" : "No"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Name: <span className="font-semibold text-gray-900">{ai.name || "Unknown"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Version: <span className="font-semibold text-gray-900">{ai.version || "Unknown"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Type: <span className="font-semibold text-gray-900">{ai.modelType || "Unknown"}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Sync</h3>
          <p className="text-sm text-gray-600">
            Daemon: <span className="font-semibold text-gray-900">{sync.running ? "Running" : "Stopped"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Connectivity: <span className="font-semibold text-gray-900">{sync.online ? "Online" : "Offline"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Supabase: <span className="font-semibold text-gray-900">{sync.supabaseConnected ? "Configured" : "Not configured"}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Printer</h3>
          <p className="text-sm text-gray-600">
            Loaded: <span className="font-semibold text-gray-900">{printer.loaded ? "Yes" : "No"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Type: <span className="font-semibold text-gray-900">{printer.type || "Unknown"}</span>
          </p>
          <p className="text-sm text-gray-600">
            Interface: <span className="font-semibold text-gray-900">{printer.interface || "Unknown"}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
          <p className="text-sm text-gray-600">
            Use refresh to recheck API health and runtime services.
          </p>
          <button
            type="button"
            disabled={isLoading}
            onClick={loadHealth}
            className="mt-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
          >
            {isLoading ? "Checking..." : "Run health check"}
          </button>
        </div>
      </div>
    </div>
  );
}
