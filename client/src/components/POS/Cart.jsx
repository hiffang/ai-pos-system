export default function Cart({ items, total, onUpdateQuantity, onClear }) {
  const lowStockWarning = items.some((item) => item.stock <= 3);

  return (
    <section className="w-[30%] h-full bg-white border-l border-outline-variant flex flex-col shadow-2xl relative z-10">
      {lowStockWarning && (
        <div className="bg-warning/15 border-b border-warning/20 px-6 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
          <span className="font-body-md text-on-background font-medium">Red raw rice is low — reorder suggested</span>
        </div>
      )}

      <div className="px-6 py-6 border-b border-surface-container flex justify-between items-center">
        <h2 className="font-h2 text-on-surface">Current Sale</h2>
        <button onClick={onClear} className="text-danger font-label-caps hover:underline">
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {items.length === 0 ? (
          <p className="text-center text-text-muted py-8">No items in cart</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex-1">
                <h4 className="font-h3 text-on-surface">{item.name}</h4>
                <p className="text-text-muted text-body-md">LKR {item.price.toLocaleString('en-LK')}</p>
              </div>
              <div className="flex items-center gap-4 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="material-symbols-outlined text-outline hover:text-danger transition-colors text-[20px]"
                >
                  remove
                </button>
                <span className="font-h3 tabular-nums min-w-[1.5rem] text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="material-symbols-outlined text-outline hover:text-primary transition-colors text-[20px]"
                >
                  add
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-6 py-6 bg-surface-container-low border-t border-surface-container">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-muted font-body-lg">Subtotal</span>
          <span className="text-on-surface font-body-lg tabular-nums">LKR {total.toLocaleString('en-LK')}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-on-surface font-h2">Total</span>
          <span className="text-primary font-currency-display tabular-nums">LKR {total.toLocaleString('en-LK')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            { label: 'Cash', icon: 'payments', fill: true, active: true },
            { label: 'Card', icon: 'credit_card', fill: false, active: false },
            { label: 'LankaQR', icon: 'qr_code', fill: false, active: false },
            { label: 'eZ/mCash', icon: 'account_balance_wallet', fill: false, active: false },
            { label: 'Transfer', icon: 'account_balance', fill: false, active: false },
            { label: 'Credit/Tab', icon: 'assignment', fill: false, active: false },
          ].map((method) => (
            <button
              key={method.label}
              className={`h-11 rounded-lg border font-label-caps transition-colors flex items-center justify-center gap-2 ${
                method.active
                  ? 'border-primary bg-secondary-container/20 text-on-secondary-container'
                  : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={method.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {method.icon}
              </span>
              {method.label}
            </button>
          ))}
        </div>

        <button className="w-full h-16 bg-[#1D9E75] text-white rounded-xl font-h1 shadow-lg hover:brightness-95 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
          Charge LKR {total.toLocaleString('en-LK')}
          <span className="material-symbols-outlined text-[32px]">arrow_forward</span>
        </button>
      </div>
    </section>
  );
}
