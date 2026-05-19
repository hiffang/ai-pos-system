/**
 * API Client Service
 * Handles all backend API calls with offline support
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function normalizePaymentMethod(method) {
  if (!method) return undefined;
  const value = method.toString().trim().toUpperCase();
  switch (value) {
    case "CASH":
      return "CASH";
    case "CARD":
    case "PAYHERECARD":
      return "CARD";
    case "WALLET":
    case "PAYHEREWALLET":
      return "WALLET";
    case "QR":
    case "ONEPAY":
      return "QR";
    case "BANK_TRANSFER":
    case "BANKTRANSFER":
    case "TRANSFER":
      return "BANK_TRANSFER";
    default:
      return undefined;
  }
}

function normalizeProduct(product) {
  const priceValue = product.priceLKR ?? product.price ?? 0;
  const stockValue = product.stockQty ?? product.quantity ?? product.stock ?? 0;
  const thresholdValue = product.reorderThreshold ?? product.threshold ?? 0;
  const parsedPrice =
    typeof priceValue === "string" ? parseFloat(priceValue) : priceValue;
  const parsedStock =
    typeof stockValue === "string" ? parseInt(stockValue, 10) : stockValue;
  const parsedThreshold =
    typeof thresholdValue === "string"
      ? parseInt(thresholdValue, 10)
      : thresholdValue;
  const categoryName =
    product.category?.name ??
    product.categoryName ??
    product.category ??
    "Uncategorized";
  const normalizedStock = Number.isNaN(parsedStock) ? 0 : parsedStock;
  const normalizedThreshold = Number.isNaN(parsedThreshold)
    ? 0
    : parsedThreshold;
  const status =
    normalizedStock <= 0
      ? "out"
      : normalizedStock <= normalizedThreshold
        ? "low"
        : "ok";

  return {
    ...product,
    price: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
    stock: normalizedStock,
    threshold: normalizedThreshold,
    category: categoryName,
    sku: product.sku ?? product.id,
    barcode: product.barcode ?? null,
    status,
  };
}

/**
 * Fetch all categories
 * @returns {Promise<array>} - Categories array
 */
export async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[API] Failed to fetch categories:", error);
    return [];
  }
}

/**
 * Create a new category
 * @param {string} name - Category name
 * @returns {Promise<object>} - Created category
 */
export async function createCategory(name) {
  try {
    const response = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to create category:", error);
    throw error;
  }
}

/**
 * Update a category
 * @param {string} id - Category ID
 * @param {string} name - New category name
 * @returns {Promise<object>} - Updated category
 */
export async function updateCategory(id, name) {
  try {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to update category:", error);
    throw error;
  }
}

/**
 * Delete a category
 * @param {string} id - Category ID
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  try {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }
  } catch (error) {
    console.error("[API] Failed to delete category:", error);
    throw error;
  }
}

/**
 * Fetch products from backend
 * @param {object} options - Query options (search, category, pagination)
 * @returns {Promise<array>} - Products array
 */
export async function fetchProducts(options = {}) {
  try {
    const { search = "", skip = 0, take = 50, category } = options;

    const params = new URLSearchParams({
      skip,
      take,
      ...(search && { search }),
      ...(category && { category }),
    });

    const response = await fetch(`${API_BASE}/products?${params}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map(normalizeProduct);
  } catch (error) {
    console.error("[API] Failed to fetch products:", error);
    return [];
  }
}

/**
 * Fetch products with pagination metadata
 * @param {object} options - Query options (search, category, pagination)
 * @returns {Promise<object>} - { data, pagination }
 */
export async function fetchProductsPage(options = {}) {
  try {
    const { search = "", skip = 0, take = 50, category } = options;

    const params = new URLSearchParams({
      skip,
      take,
      ...(search && { search }),
      ...(category && { category }),
    });

    const response = await fetch(`${API_BASE}/products?${params}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      data: (data.data || []).map(normalizeProduct),
      pagination: data.pagination || { skip, take, total: 0 },
    };
  } catch (error) {
    console.error("[API] Failed to fetch products:", error);
    return { data: [], pagination: { skip: 0, take: 0, total: 0 } };
  }
}

/**
 * Fetch inventory summary metrics
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function fetchProductsSummary(options = {}) {
  try {
    const { search = "", category } = options;
    const params = new URLSearchParams({
      ...(search && { search }),
      ...(category && { category }),
    });

    const response = await fetch(
      `${API_BASE}/products/summary${params.toString() ? `?${params}` : ""}`,
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error("[API] Failed to fetch product summary:", error);
    return {};
  }
}

/**
 * Get single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<object>} - Product data
 */
export async function fetchProductById(id) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ? normalizeProduct(data.data) : null;
  } catch (error) {
    console.error("[API] Failed to fetch product:", error);
    return null;
  }
}

/**
 * Look up a product by its scanned barcode. Resolves null on 404 so the caller
 * can render a "not registered" toast without exception handling.
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function fetchProductByBarcode(code) {
  try {
    const response = await fetch(
      `${API_BASE}/products/by-barcode/${encodeURIComponent(code)}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ? normalizeProduct(data.data) : null;
  } catch (error) {
    console.error("[API] Failed to fetch product by barcode:", error);
    return null;
  }
}

/**
 * Update a product
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateProduct(id, payload) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ? normalizeProduct(data.data) : null;
  } catch (error) {
    console.error("[API] Failed to update product:", error);
    throw error;
  }
}

/**
 * Delete a product
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }
  } catch (error) {
    console.error("[API] Failed to delete product:", error);
    throw error;
  }
}

/**
 * Create a transaction with items
 * @param {object} transaction - Transaction data
 * @returns {Promise<object>} - Created transaction
 */
export async function createTransaction(transaction) {
  try {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      order: data.data,
      stockUpdates: data.stockUpdates || [],
    };
  } catch (error) {
    console.error("[API] Failed to create transaction:", error);
    throw error;
  }
}

/**
 * Fetch a single transaction (order) by ID with items, product info,
 * payment, and cashier. Used by the receipt detail view.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function fetchTransactionById(id) {
  try {
    const response = await fetch(
      `${API_BASE}/transactions/${encodeURIComponent(id)}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("[API] Failed to fetch transaction:", error);
    return null;
  }
}

/**
 * Process a payment
 * @param {object} payment - Payment data
 * @returns {Promise<object>} - Payment result
 */
export async function processPayment(payment) {
  try {
    const normalizedMethod = normalizePaymentMethod(payment?.method);
    const response = await fetch(`${API_BASE}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payment,
        ...(normalizedMethod && { method: normalizedMethod }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to process payment:", error);
    throw error;
  }
}

/**
 * Print a receipt for an existing order via the configured thermal printer.
 * Resolves with { ok: true } on success, or null on any failure — printing
 * failures must never block the POS workflow.
 * @param {string} orderId
 * @returns {Promise<object|null>}
 */
export async function printReceipt(orderId) {
  try {
    const response = await fetch(`${API_BASE}/hardware/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || { ok: true };
  } catch (error) {
    console.error("[API] Failed to print receipt:", error);
    return null;
  }
}

/**
 * Get server health and sync status
 * @returns {Promise<object>} - Health status
 */
export async function getServerHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[API] Server unreachable:", error);
    return { status: "offline" };
  }
}

/**
 * Fetch AI demand forecast for a single product
 * @param {string} productId
 * @returns {Promise<object|null>} - Prediction object or null
 */
export async function fetchProductForecast(productId) {
  try {
    const response = await fetch(`${API_BASE}/ai/forecast/${productId}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("[API] Failed to fetch product forecast:", error);
    return null;
  }
}

/**
 * Fetch AI demand forecasts for a batch of products
 * @param {string[]} productIds
 * @returns {Promise<{ data: object[], missing: string[] }>}
 */
export async function fetchBatchForecasts(productIds) {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { data: [], missing: [] };
    }

    const response = await fetch(`${API_BASE}/ai/forecast/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      data: data.data || [],
      missing: data.missing || [],
    };
  } catch (error) {
    console.error("[API] Failed to fetch batch forecasts:", error);
    return { data: [], missing: productIds };
  }
}

/**
 * Fetch dashboard overview metrics
 * @returns {Promise<object>} - Dashboard data
 */
export async function fetchDashboardOverview() {
  try {
    const response = await fetch(`${API_BASE}/dashboard/overview`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error("[API] Failed to fetch dashboard overview:", error);
    return {};
  }
}
