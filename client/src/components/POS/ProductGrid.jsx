import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onAddToCart }) {
  return (
    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-3 gap-4 pb-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
