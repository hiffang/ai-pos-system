export default function PaymentMethodChart() {
  const methods = [
    { name: "Cash", percentage: 65, color: "#00694c" },
    { name: "Card", percentage: 25, color: "#5a53a9" },
    { name: "Store Credit", percentage: 10, color: "#EF9F27" },
  ];

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
          <circle
            cx="96"
            cy="96"
            fill="transparent"
            r="80"
            stroke="#00694c"
            strokeDasharray="502"
            strokeDashoffset="150"
            strokeWidth="24"
          />
          <circle
            cx="96"
            cy="96"
            fill="transparent"
            r="80"
            stroke="#5a53a9"
            strokeDasharray="502"
            strokeDashoffset="400"
            strokeWidth="24"
          />
          <circle
            cx="96"
            cy="96"
            fill="transparent"
            r="80"
            stroke="#EF9F27"
            strokeDasharray="502"
            strokeDashoffset="480"
            strokeWidth="24"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-xs text-text-muted font-bold uppercase">Total</p>
          <p className="text-xl font-bold">100%</p>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        {methods.map((method) => (
          <div
            key={method.name}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center">
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: method.color }}
              ></span>
              {method.name}
            </div>
            <span className="font-bold">{method.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
