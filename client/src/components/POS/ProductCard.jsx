export default function ProductCard({ product, onAddToCart }) {
  const isLowStock = product.status === "low";
  const hasDiscount =
    product.discount && product.originalPrice > product.price;

  return (
    <div
      className="relative bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between"
      style={{
        borderLeft: isLowStock ? "4px solid #E24B4A" : "4px solid transparent",
      }}
      onClick={() => onAddToCart(product)}
    >
      {hasDiscount ? (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500 text-white">
          Sale
        </span>
      ) : null}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            {hasDiscount ? (
              <p className="text-xs text-gray-400 line-through leading-none mb-0.5">
                LKR {product.originalPrice.toLocaleString("en-LK")}
              </p>
            ) : null}
            <p
              style={{
                fontSize: "20px",
                lineHeight: "1",
                letterSpacing: "-0.02em",
                fontWeight: "700",
                color: hasDiscount ? "#DC2626" : "#145da3",
              }}
            >
              LKR {product.price.toLocaleString("en-LK")}
            </p>
          </div>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "28px",
              color: isLowStock ? "#E24B4A" : "#008560",
            }}
          >
            {isLowStock ? "warning" : "add_circle"}
          </span>
        </div>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "4px",
            color: "#1a1c1b",
          }}
        >
          {product.name}
        </h3>
        <p
          style={{
            fontSize: "14px",
            fontWeight: isLowStock ? "600" : "400",
            color: isLowStock ? "#E24B4A" : "#64748B",
          }}
        >
          {isLowStock ? "Low Stock: " : "Stock: "} {product.stock} Units
        </p>
      </div>
    </div>
  );
}
