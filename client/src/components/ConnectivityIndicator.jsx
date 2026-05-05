import { useEffect, useState } from "react";

/**
 * Online/Offline Status Indicator
 * Shows connection status in header
 * Disables cloud features when offline
 */
export default function ConnectivityIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
        isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-600" : "bg-red-600"
        }`}
      />
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}
