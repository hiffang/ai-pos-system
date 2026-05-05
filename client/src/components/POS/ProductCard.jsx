export default function ProductCard({ product, onAddToCart }) {
  const isLowStock = product.status === "low";

  return (
    <div
      className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between"
      style={{
        borderLeft: isLowStock ? "4px solid #E24B4A" : "4px solid transparent",
      }}
      onClick={() => onAddToCart(product)}
    >
      <div className="aspect-square rounded-lg bg-gray-100 mb-4 overflow-hidden">
        <img
          className="w-full h-full object-cover"
          src={product.image}
          alt={product.name}
        />
      </div>
      <div>
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
        <div className="flex justify-between items-end">
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: isLowStock ? "600" : "400",
                color: isLowStock ? "#E24B4A" : "#64748B",
              }}
            >
              {isLowStock ? "Low Stock: " : "Stock: "} {product.stock}{" "}
              {product.id === "6" ? "kg" : "Units"}
            </p>
            <p
              style={{
                fontSize: "18px",
                lineHeight: "1",
                letterSpacing: "-0.02em",
                fontWeight: "700",
                color: "#145da3",
                marginTop: "4px",
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
      </div>
    </div>
  );
}
