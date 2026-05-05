export default function SalesChart() {
  const data = [40, 55, 75, 45, 85, 100, 60];
  const maxValue = 100;

  return (
    <div className="bg-surface p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h3 className="font-h3 text-text-main">Sales This Week</h3>
        <div className="flex space-x-2">
          <span className="text-xs bg-surface-container px-2 py-1 rounded">
            Daily
          </span>
          <span className="text-xs bg-primary text-white px-2 py-1 rounded">
            Weekly
          </span>
        </div>
      </div>
      <div className="h-64 flex items-end justify-between px-4 pb-4 gap-2">
        {data.map((value, idx) => (
          <div
            key={idx}
            className="flex-1 bg-primary rounded-t-lg transition-all hover:opacity-80"
            style={{
              height: `${(value / maxValue) * 100}%`,
              opacity: 0.3 + (value / maxValue) * 0.7,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between px-4 mt-2 text-xs text-text-muted font-semibold">
        <span>MON</span>
        <span>TUE</span>
        <span>WED</span>
        <span>THU</span>
        <span>FRI</span>
        <span>SAT</span>
        <span>SUN</span>
      </div>
    </div>
  );
}
