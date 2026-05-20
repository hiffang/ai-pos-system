import { useEffect, useState } from "react";
import ConnectivityIndicator from "../ConnectivityIndicator";

const DATE_FORMAT = new Intl.DateTimeFormat("en-LK", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-LK", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function Header() {
  const [now, setNow] = useState(() => new Date());

  // Align the first update to the next minute boundary so the clock flips
  // at :00 sharp rather than at a random offset from mount, then tick once
  // per minute thereafter.
  useEffect(() => {
    let intervalId;
    const tick = () => setNow(new Date());
    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm flex justify-between items-center h-16 px-6 w-full z-50">
      <div className="flex items-center gap-8">
        <div>
          <div className="text-lg font-black text-[#1D9E75]">CeylonPOS</div>
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-container-low rounded-full">
          <span className="material-symbols-outlined text-primary">
            account_circle
          </span>
          <span className="font-body-md text-on-surface">Kasun · Cashier</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <ConnectivityIndicator />
        <div className="text-right tabular-nums leading-tight">
          <div className="text-xs text-on-surface-variant">
            {DATE_FORMAT.format(now)}
          </div>
          <div className="font-h3 text-on-surface">{TIME_FORMAT.format(now)}</div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button className="material-symbols-outlined text-gray-600 hover:bg-gray-50 p-2 rounded-full transition-colors cursor-pointer active:opacity-80">
            notifications
          </button>
          <button className="material-symbols-outlined text-gray-600 hover:bg-gray-50 p-2 rounded-full transition-colors cursor-pointer active:opacity-80">
            sync
          </button>
        </div>
      </div>
    </header>
  );
}
