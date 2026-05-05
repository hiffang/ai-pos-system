import ConnectivityIndicator from "../ConnectivityIndicator";

export default function Header() {
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm flex justify-between items-center h-16 px-6 w-full z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-bold text-[#1D9E75]">CeylonPOS</h1>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-container-low rounded-full">
          <span className="material-symbols-outlined text-primary">
            account_circle
          </span>
          <span className="font-body-md text-on-surface">Kasun · Cashier</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <ConnectivityIndicator />
        <div className="font-h3 text-on-surface-variant tabular-nums">
          {currentTime}
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
