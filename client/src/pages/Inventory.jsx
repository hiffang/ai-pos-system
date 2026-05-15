import { useState, useEffect, useCallback } from "react";
import CategoryManager from "../components/CategoryManager";
import { fetchCategories, fetchProductsPage } from "../store/apiClient";

const STATUS_COLORS = {
  "In Stock": "bg-green-100 text-green-700",
  "Low Stock": "bg-yellow-100 text-yellow-700",
  "Out of Stock": "bg-red-100 text-red-700",
};
const PAGE_SIZE = 8;

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [fetchCategories]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const { data, pagination } = await fetchProductsPage({
        search: searchTerm,
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setProducts(data);
      setTotalProducts(pagination?.total ?? data.length);
    } catch (error) {
      console.error("Failed to load products:", error);
      setProductsError("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, [currentPage, fetchProductsPage, searchTerm, selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalStockValue = products.reduce(
    (sum, p) => sum + p.stock * p.price,
    0,
  );
  const lowStockItems = products.filter(
    (p) => p.stock > 0 && p.stock <= p.threshold,
  ).length;

  const categoryTotals = products.reduce((acc, product) => {
    const categoryName = product.category || "Uncategorized";
    acc[categoryName] =
      (acc[categoryName] || 0) + product.stock * product.price;
    return acc;
  }, {});

  const [topCategory, topCategoryValue] =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || [];
  const topCategoryPercent =
    totalStockValue > 0
      ? Math.round((topCategoryValue / totalStockValue) * 100)
      : 0;

  const formatCurrency = (amount) => {
    return `LKR ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const pageStart = totalProducts === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalProducts);

  const getStatus = (stock, threshold) => {
    if (stock <= 0) return "Out of Stock";
    if (stock <= threshold) return "Low Stock";
    return "In Stock";
  };

  const getPageNumbers = () => {
    const maxPages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let end = Math.min(totalPages, start + maxPages - 1);
    if (end - start < maxPages - 1) {
      start = Math.max(1, end - maxPages + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">
            Manage stock levels and product catalog across branches.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">
          <span className="material-symbols-outlined">add</span>
          Add Product
        </button>
      </div>

      {/* Inventory Insights Banner */}
      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-orange-600 mt-0.5">
            lightbulb
          </span>
          <div>
            <h3 className="font-semibold text-orange-800">
              ⚡ AI Stock Prediction Alert
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              Based on historical trends, demand for "Dairieggs" is expected to
              rise 25% next week. Consider increasing stock now.
            </p>
          </div>
        </div>
        <button className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600">
          View details
        </button>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            Stock Value
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalStockValue)}
          </p>
          <p className="text-sm text-teal-600 mt-2">↑ 14.2% from last month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            Low Stock Items
          </p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {lowStockItems} Items
          </p>
          <p className="text-sm text-orange-600 mt-2">
            ⚠️ Requires immediate attention
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            Top Performing Category
          </p>
          <p className="text-xl font-bold text-gray-900 mt-2">
            {topCategory || "N/A"}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {topCategory
              ? `${topCategoryPercent}% of inventory value`
              : "No data yet"}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder="Search by SKU or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
          disabled={categoriesLoading}
        >
          <option value="all">
            {categoriesLoading ? "Loading categories..." : "All Categories"}
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <span className="material-symbols-outlined">tune</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-600 font-semibold">
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Threshold</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productsLoading ? (
                <tr>
                  <td
                    className="px-6 py-6 text-center text-gray-500"
                    colSpan={8}
                  >
                    Loading products...
                  </td>
                </tr>
              ) : productsError ? (
                <tr>
                  <td
                    className="px-6 py-6 text-center text-red-600"
                    colSpan={8}
                  >
                    {productsError}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-6 text-center text-gray-500"
                    colSpan={8}
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = getStatus(product.stock, product.threshold);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-gray-700">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 text-teal-600 font-semibold">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {product.threshold}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900">
                          <span className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900">
                          <span className="material-symbols-outlined text-lg">
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {pageStart}-{pageEnd} of {totalProducts} products
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              {"<"}
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded font-medium ${
                  currentPage === page
                    ? "bg-teal-600 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
            >
              {">"}
            </button>
          </div>
        </div>
      </div>

      {/* Category Manager Section */}
      <CategoryManager
        categories={categories}
        onCategoriesChange={loadCategories}
      />
    </div>
  );
}
