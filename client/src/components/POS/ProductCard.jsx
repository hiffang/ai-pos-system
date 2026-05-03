export default function ProductCard({ product, onAddToCart }) {
  const isLowStock = product.status === 'low';

  return (
    <div
      className={`bg-surface rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between border-l-4 ${
        isLowStock ? 'border-danger' : 'border-transparent'
      }`}
      onClick={() => onAddToCart(product)}
    >
      <div className="aspect-square rounded-lg bg-surface-container-low mb-4 overflow-hidden">
        <img className="w-full h-full object-cover" src={product.image} alt={product.name} />
      </div>
      <div>
        <h3 className="font-h3 text-on-surface mb-1">{product.name}</h3>
        <div className="flex justify-between items-end">
          <div>
            <p className={`font-body-md ${isLowStock ? 'text-danger font-semibold' : 'text-text-muted'}`}>
              {isLowStock ? 'Low Stock: ' : 'Stock: '} {product.stock} {product.id === '6' ? 'kg' : 'Units'}
            </p>
            <p className="font-currency-display text-tertiary mt-1">LKR {product.price.toLocaleString('en-LK')}</p>
          </div>
          <span className={`material-symbols-outlined ${isLowStock ? 'text-danger' : 'text-primary-container'}`}>
            {isLowStock ? 'warning' : 'add_circle'}
          </span>
        </div>
      </div>
    </div>
  );
}
