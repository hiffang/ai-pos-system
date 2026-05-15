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
    case "CREDIT":
      return "CREDIT";
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
 * Fetch customer credit accounts
 * @param {object} options
 * @returns {Promise<array>}
 */
export async function fetchCustomerCredits(options = {}) {
  try {
    const { search = "" } = options;
    const params = new URLSearchParams({
      ...(search && { search }),
    });

    const response = await fetch(
      `${API_BASE}/customer-credits${params.toString() ? `?${params}` : ""}`,
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[API] Failed to fetch customer credits:", error);
    return [];
  }
}

/**
 * Create customer credit account
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createCustomerCredit(payload) {
  try {
    const response = await fetch(`${API_BASE}/customer-credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to create customer credit:", error);
    throw error;
  }
}

/**
 * Update customer credit account
 * @param {string} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateCustomerCredit(id, payload) {
  try {
    const response = await fetch(`${API_BASE}/customer-credits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to update customer credit:", error);
    throw error;
  }
}

/**
 * Adjust customer credit balance
 * @param {string} id
 * @param {number} amount
 * @returns {Promise<object>}
 */
export async function adjustCustomerCreditBalance(id, amount) {
  try {
    const response = await fetch(`${API_BASE}/customer-credits/${id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("[API] Failed to adjust customer credit:", error);
    throw error;
  }
}

/**
 * Delete customer credit account
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCustomerCredit(id) {
  try {
    const response = await fetch(`${API_BASE}/customer-credits/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }
  } catch (error) {
    console.error("[API] Failed to delete customer credit:", error);
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
