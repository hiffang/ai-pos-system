export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  bordered,
}) {
  const getColorStyle = (colorName) => {
    switch (colorName) {
      case "danger":
        return { color: "#E24B4A" };
      case "tertiary":
        return { color: "#145da3" };
      case "text-main":
        return { color: "#64748B" };
      case "primary":
      default:
        return { color: "#00694c" };
    }
  };

  return (
    <div
      className="bg-white p-6 rounded-xl shadow-sm border"
      style={bordered ? { borderLeft: "4px solid #E24B4A" } : { borderColor: "transparent" }}
    >
      <p
        style={{
          fontSize: "12px",
          lineHeight: "1",
          letterSpacing: "0.05em",
          fontWeight: "600",
          color: "#64748B",
          marginBottom: "8px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "28px",
          lineHeight: "1",
          letterSpacing: "-0.02em",
          fontWeight: "700",
          ...getColorStyle(color),
        }}
      >
        {value}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: "16px",
          fontSize: "12px",
          fontWeight: "600",
          ...getColorStyle(color),
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "14px", marginRight: "4px" }}>
          {icon}
        </span>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
