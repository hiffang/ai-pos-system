const METHOD_LABELS = {
  CASH: "Cash",
  CARD: "Card",
  WALLET: "Wallet",
  QR: "LankaQR",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT: "Store Credit",
};

const METHOD_COLORS = {
  CASH: "#00694c",
  CARD: "#5a53a9",
  WALLET: "#2f80ed",
  QR: "#ef9f27",
  BANK_TRANSFER: "#0f766e",
  CREDIT: "#ef9f27",
};

export default function PaymentMethodChart({
  methods = [],
  isLoading = false,
}) {
  const totalPercentage = methods.reduce(
    (sum, method) => sum + (method.percentage || 0),
    0,
  );
  const hasData = methods.some((method) => (method.percentage || 0) > 0);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulativeDash = 0;

  return (
    <div className="bg-surface p-6 rounded-xl shadow-sm flex flex-col">
      <h3 className="font-h3 text-text-main mb-8">Sales by Payment Method</h3>
      <div className="flex-1 flex items-center justify-center relative">
        <svg className="w-48 h-48 transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            fill="transparent"
            r="80"
            stroke="#f1f1f1"
            strokeWidth="24"
          />
          {methods.map((method) => {
            const percentage = method.percentage || 0;
            const dash = (percentage / 100) * circumference;
            const offset = -cumulativeDash;
            cumulativeDash += dash;

            return (
              <circle
                key={method.method}
                cx="96"
                cy="96"
                fill="transparent"
                r="80"
                stroke={METHOD_COLORS[method.method] || "#64748b"}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeWidth="24"
              />
            );
          })}
        </svg>
        <div className="absolute text-center">
          <p className="text-xs text-text-muted font-bold uppercase">Total</p>
          <p className="text-xl font-bold">{Math.min(totalPercentage, 100)}%</p>
        </div>
      </div>
      {isLoading ? (
        <div className="mt-6 text-xs text-text-muted text-center">
          Loading payment mix...
        </div>
      ) : hasData ? (
        <div className="mt-6 space-y-2">
          {methods.map((method) => (
            <div
              key={method.method}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center">
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{
                    backgroundColor: METHOD_COLORS[method.method] || "#64748b",
                  }}
                ></span>
                {METHOD_LABELS[method.method] || method.method}
              </div>
              <span className="font-bold">{method.percentage || 0}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 text-xs text-text-muted text-center">
          No payment data available.
        </div>
      )}
    </div>
  );
}
