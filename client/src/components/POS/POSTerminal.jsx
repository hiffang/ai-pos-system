import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ProductGrid from './ProductGrid';
import Cart from './Cart';

export default function POSTerminal() {
  const [cartItems, setCartItems] = useState([
    { id: '1', name: 'Keeri Samba Rice 5kg', price: 1450, quantity: 1 },
    { id: '2', name: 'Fresh Milk 1L', price: 450, quantity: 2 },
  ]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const products = [
    {
      id: '1',
      name: 'Keeri Samba Rice 5kg',
      category: 'Rice & Grains',
      price: 1450,
      stock: 42,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgKycKu80a-mdWClY0cpRMHPnUm5L9VEjXjwm4hwnduljXoJESOSPwGKNShQzswPs6EVibiWCV1Tz89VYXUYe_sIvxKtH4_0FZN1K2DAd6m-CuC_UakJ9qBckx0QAqztQdNTCIkNAcFNXT8_vn8a6F5zkBsoM6IVhWGtaYhfwlriwzsmQTGU6NNji7yoFqFIxTEnIbl5ig1ZmKzOkNeUD5ytrkLUBe1W_B-iSaI-nST-naPJyu1vg07gxCAi9QG60pAVSwbI9QP-c',
      status: 'normal',
    },
    {
      id: '2',
      name: 'Red Raw Rice 1kg',
      category: 'Rice & Grains',
      price: 280,
      stock: 3,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO2iBvpoZLR6_cno5-ZphWYE6mRK-GvAPv6J-0eStYthiu6jjs-vB9GTrOx9X81hwrduMkHqyuy3lIduKNwYdStII4lzyyFQQ-QLGALD5tN--vNPg9Vy8r5_jRi2nMIIPtpF9sz_DMgXweaneULfgmL4apDzryN7yTXr4ZN1Ooo6lkRYTGIyzzfAzDzTBNfhtJngpBFo8shyIFEtFwQ9AxhaeACazzPKBPinC84fi3b2EznZU_kgqfhUPg5DJmz7Yz_zh08ZdcGHI',
      status: 'low',
    },
    {
      id: '3',
      name: 'Fresh Milk 1L',
      category: 'Dairy',
      price: 450,
      stock: 18,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDozz66ung8Afejxufm6bsV0A2bnUWJEB5ftpuXq5Xq3NcDZbJFCT4dQ3ctQEwrkJcaA4L4CL0ps2Kia7MMId8pFKqdqqPx7CUKW6dDDNdXaZJe9XF89YIBmtylIY32WtXnUvkZqY3qEx8NXg7t9CC1KIAclEngA2q3d_b67wjQzcKmtY8tbTJdt3rfuRusQiat7fs1bZqEXjakciuzZ8C84GfspHgUADGgLL2HBznWSZIlF3wt9U1foUZtjeeopEIeIBzNA7yOHCM',
      status: 'normal',
    },
    {
      id: '4',
      name: 'Coconut Water 500ml',
      category: 'Beverages',
      price: 180,
      stock: 24,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEBK543sycKaluww7O_zUgxY1BPeq813KdBkjeagw4zYcCNxQryUtIV8kjn6QvUV3-b6tNKUfjD4he4DcExMr6pMIdQpWLz4ImbMJ49YZEuHGtWMDmc-ZuZ7a1o1ElAi3OlWY0C6ka5VLBInw96sygONCajV3tBOsEnJBi2l_dbl1uPXJ9VGoKFIPxbuvQKAqcQ4oY2EkPNVQ5LuYOsAv0q5WJpie5wZBVE5u5rEPSlSHRoBNgwgHGfeG-Z_gyk5zI6pEEaODwVDY',
      status: 'normal',
    },
    {
      id: '5',
      name: 'Ceylon Cinnamon 100g',
      category: 'Spices',
      price: 890,
      stock: 56,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOZriYqnvgCdYGuSnqw61FPpGGVJqEcSWorqiEnwOIEsNx26UwZJGycp0wFoVk6RSWEPq2p1gHH0RS08SHbZJhLjjcdLmP2EnbZ5cyHRhcQaUCHosJcqwB5Rh4wF9IN1NUaVyTQ198Rnbt-jd7hsPOVt1Mwo81Phxfwousv2GAKKavy7Y0jIlCMVYL9DEMEQbBj5dIx3bpH5dHBG4jUKWtK_hP_wuIRbKIBXL3X7hJz4Oa94XpLexQ_iIWy9kpCEfz3YThKJwBIaU',
      status: 'normal',
    },
    {
      id: '6',
      name: 'Local Lemons (kg)',
      category: 'Snacks',
      price: 650,
      stock: 1.5,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDftcsq4rcnPYP5njtGfD3IlKH2MArhC3rREzvAoC4z9DC-J37MmLqlRdj9UukYzUg0wJP2YwE4M9Na89b5A2qIlHb7w3mwKg0y6eFS2shPJQm44IXeOrpDHoFiv_YCyS2Xxtq7OEvvbvI0-Ao68UNqQpuR028k5pPYbtw6Fc15kzWd7E0RoIWPxjsJZY69UAoWQ9rSMch22iSGFTCBU2V_h1dC9Lzp1Js0w8fXtjjRHDy0BBCR6wnkrb9--H3zdY3SbytTHZoqruM',
      status: 'low',
    },
  ];

  const categories = ['All', 'Rice & Grains', 'Dairy', 'Beverages', 'Snacks', 'Household', 'Spices'];

  const addToCart = (product) => {
    const existing = cartItems.find((item) => item.id === product.id);
    if (existing) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter((item) => item.id !== id));
    } else {
      setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)));
    }
  };

  const clearCart = () => setCartItems([]);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="ml-60 flex-1 flex overflow-hidden">
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
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat.toLowerCase())}
                  className={`px-6 py-2 rounded-full font-label-caps whitespace-nowrap transition-colors ${
                    selectedCategory === cat.toLowerCase() || (cat === 'All' && selectedCategory === 'all')
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-white border border-outline-variant text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <ProductGrid products={products} onAddToCart={addToCart} />
          </section>

          <Cart items={cartItems} total={total} onUpdateQuantity={updateQuantity} onClear={clearCart} />
        </main>
      </div>
    </div>
  );
}
