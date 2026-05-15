import { useState, useEffect } from "react";
import ProductGrid from "./ProductGrid";
import Cart from "./Cart";
import {
  fetchProducts,
  fetchCategories,
  createTransaction,
  processPayment,
} from "../../store/apiClient";

export default function POSTerminal() {
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");

  // Fetch products and categories on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addToCart = (product) => {
    const existing = cartItems.find((item) => item.id === product.id);
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter((item) => item.id !== id));
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.id === id ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const clearCart = () => setCartItems([]);
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handleCheckout = async () => {
    try {
      // Create transaction
      const transaction = await createTransaction({
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        total,
        paymentMethod: selectedPaymentMethod,
      });

      // Process payment
      await processPayment({
        method: selectedPaymentMethod,
        amount: total,
      });

      // Clear cart after successful transaction
      clearCart();
      alert("Transaction completed successfully!");
    } catch (error) {
      alert(`Checkout failed: ${error.message}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <main className="flex-1 flex overflow-hidden">
        <section className="w-[70%] h-full flex flex-col p-6 overflow-hidden bg-background">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                className="w-full h-11 pl-12 pr-12 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:border-primary font-body-md"
                placeholder="Search by name or code..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-primary transition-colors">
                barcode_scanner
              </span>
            </div>
            <button className="bg-primary text-on-primary h-11 px-6 rounded-lg font-h3 shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined">add</span>
              Custom Item
            </button>
          </div>

          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {/* All Categories button */}
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-6 py-2 rounded-full font-label-caps whitespace-nowrap transition-colors ${
                selectedCategory === "all"
                  ? "bg-[#1D9E75] text-white"
                  : "bg-white border border-outline-variant text-on-surface hover:bg-surface-container"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name.toLowerCase())}
                className={`px-6 py-2 rounded-full font-label-caps whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name.toLowerCase()
                    ? "bg-[#1D9E75] text-white"
                    : "bg-white border border-outline-variant text-on-surface hover:bg-surface-container"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <ProductGrid products={products} onAddToCart={addToCart} />
        </section>

        <Cart
          items={cartItems}
          total={total}
          onUpdateQuantity={updateQuantity}
          onClear={clearCart}
          onCheckout={handleCheckout}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodChange={setSelectedPaymentMethod}
        />
      </main>
    </div>
  );
}
