import { useState, useEffect, useCallback } from "react";
import CategoryManager from "../components/CategoryManager";
import {
  fetchCategories,
  fetchProductsPage,
  fetchProductsSummary,
  updateProduct,
  deleteProduct,
} from "../store/apiClient";

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
  const [summary, setSummary] = useState({
    totalStockValue: 0,
    lowStockItems: 0,
    topCategory: null,
    topCategoryValue: 0,
  });
  const [totalProducts, setTotalProducts] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    priceLKR: "",
    stockQty: "",
    reorderThreshold: "",
    categoryId: "",
  });
  const [formError, setFormError] = useState("");

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
      const summaryData = await fetchProductsSummary({
        search: searchTerm,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setSummary({
        totalStockValue: summaryData.totalStockValue || 0,
        lowStockItems: summaryData.lowStockItems || 0,
        topCategory: summaryData.topCategory || null,
        topCategoryValue: summaryData.topCategoryValue || 0,
      });
      setTotalProducts(
        summaryData.totalProducts ?? pagination?.total ?? data.length,
      );
    } catch (error) {
      console.error("Failed to load products:", error);
      setProductsError("Failed to load products");
      setSummary({
        totalStockValue: 0,
        lowStockItems: 0,
        topCategory: null,
        topCategoryValue: 0,
      });
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

  const totalStockValue = summary.totalStockValue || 0;
  const lowStockItems = summary.lowStockItems || 0;
  const lowStockAccent =
    lowStockItems > 0 ? "text-orange-600" : "text-green-600";
  const lowStockMessage =
    lowStockItems > 0
      ? "⚠️ Requires immediate attention"
      : "Stock levels look healthy";

  const topCategory = summary.topCategory;
  const topCategoryValue = summary.topCategoryValue || 0;
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

  const openEditModal = (product) => {
    const categoryId =
      categories.find((cat) => cat.name === product.category)?.id || "";
    setActiveProduct(product);
    setEditForm({
      name: product.name || "",
      sku: product.sku || "",
      priceLKR: product.price?.toString() || "",
      stockQty: product.stock?.toString() || "",
      reorderThreshold: product.threshold?.toString() || "",
      categoryId,
    });
    setFormError("");
    setIsEditOpen(true);
  };

  const openDeleteModal = (product) => {
    setActiveProduct(product);
    setFormError("");
    setIsDeleteOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveProduct = async () => {
    if (!activeProduct) return;
    if (!editForm.name || !editForm.sku || !editForm.categoryId) {
      setFormError("Name, SKU, and category are required.");
      return;
    }

    const parsedPrice = parseFloat(editForm.priceLKR);
    if (Number.isNaN(parsedPrice)) {
      setFormError("Price must be a number.");
      return;
    }

    const parsedStock = editForm.stockQty ? parseInt(editForm.stockQty, 10) : 0;
    const parsedThreshold = editForm.reorderThreshold
      ? parseInt(editForm.reorderThreshold, 10)
      : 0;

    try {
      await updateProduct(activeProduct.id, {
        name: editForm.name,
        sku: editForm.sku,
        priceLKR: parsedPrice,
        stockQty: parsedStock,
        reorderThreshold: parsedThreshold,
        categoryId: editForm.categoryId,
      });
      setIsEditOpen(false);
      setActiveProduct(null);
      await loadProducts();
    } catch (error) {
      setFormError(error.message || "Failed to update product.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!activeProduct) return;
    try {
      await deleteProduct(activeProduct.id);
      setIsDeleteOpen(false);
      setActiveProduct(null);
      await loadProducts();
    } catch (error) {
      setFormError(error.message || "Failed to delete product.");
    }
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
          <p className={`text-3xl font-bold mt-2 ${lowStockAccent}`}>
            {lowStockItems} Items
          </p>
          <p className={`text-sm mt-2 ${lowStockAccent}`}>{lowStockMessage}</p>
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
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                          onClick={() => openEditModal(product)}
                        >
                          <span className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <button
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                          onClick={() => openDeleteModal(product)}
                        >
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

      {isEditOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Product
              </h3>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setIsEditOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={editForm.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SKU
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={editForm.sku}
                  onChange={(e) => handleEditChange("sku", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price (LKR)
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={editForm.priceLKR}
                    onChange={(e) =>
                      handleEditChange("priceLKR", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={editForm.stockQty}
                    onChange={(e) =>
                      handleEditChange("stockQty", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Threshold
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={editForm.reorderThreshold}
                    onChange={(e) =>
                      handleEditChange("reorderThreshold", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={editForm.categoryId}
                    onChange={(e) =>
                      handleEditChange("categoryId", e.target.value)
                    }
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {formError ? (
                <p className="text-sm text-red-600">{formError}</p>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                onClick={handleSaveProduct}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Product
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete
              {activeProduct ? ` ${activeProduct.name}` : " this product"}? This
              cannot be undone.
            </p>
            {formError ? (
              <p className="text-sm text-red-600 mt-3">{formError}</p>
            ) : null}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
                onClick={handleDeleteProduct}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
