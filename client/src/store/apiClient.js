/**
 * API Client Service
 * Handles all backend API calls with offline support + JWT authentication.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const AUTH_TOKEN_KEY = "ai-pos.authToken";

/** @returns {string | null} */
export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @param {string | null} token */
export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore (private mode / storage disabled)
  }
}

/**
 * fetch() wrapper that attaches the Bearer token and triggers a hard redirect
 * to /login on 401 (unless the caller passes options.skipAuthRedirect, e.g.
 * the login endpoint itself, where a 401 means "bad password", not "session
 * expired").
 *
 * @param {RequestInfo | URL} input
 * @param {RequestInit & { skipAuthRedirect?: boolean }} [options]
 */
async function apiFetch(input, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...options, headers });
  if (response.status === 401 && !options.skipAuthRedirect) {
    setAuthToken(null);
    if (typeof window !== "undefined") {
      const isFile = window.location.protocol === "file:";
      const alreadyOnLogin = isFile
        ? !window.location.hash.startsWith("#/login")
        : window.location.pathname !== "/login";
      if (alreadyOnLogin) {
        window.location.href = isFile ? "#/login" : "/login";
      }
    }
  }
  return response;
}

/**
 * Exchange email + password for a JWT. Stores the token on success.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ id: string, name: string, email: string, role: string }>}
 */
export async function login(email, password) {
  const response = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Login failed (${response.status})`);
  }
  setAuthToken(body.data.token);
  return body.data.user;
}

/**
 * Fetch the currently authenticated user. Returns null if the token is
 * missing or invalid (apiFetch will already have cleared the token + redirected).
 */
export async function fetchMe() {
  if (!getAuthToken()) return null;
  try {
    const response = await apiFetch(`${API_BASE}/auth/me`);
    if (!response.ok) return null;
    const body = await response.json();
    return body.data || null;
  } catch (error) {
    console.error("[API] Failed to fetch current user:", error);
    return null;
  }
}

/** Clear the stored token (the rest of logout — clearing UI state — is the store's job). */
export function logout() {
  setAuthToken(null);
}

/**
 * Change the currently authenticated user's password. Throws on failure.
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(currentPassword, newPassword) {
  const response = await apiFetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
    skipAuthRedirect: true,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Password change failed (${response.status})`);
  }
  return true;
}

// ---- User management (admin only) ---------------------------------------

/** @returns {Promise<Array<object>>} */
export async function fetchUsers() {
  const response = await apiFetch(`${API_BASE}/users`);
  if (!response.ok) {
    return [];
  }
  const body = await response.json();
  return body.data || [];
}

/**
 * @param {{ name: string, email: string, role: string, password: string }} payload
 */
export async function createUser(payload) {
  const response = await apiFetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Create user failed (${response.status})`);
  }
  return body.data;
}

/**
 * @param {string} id
 * @param {{ name?: string, email?: string, role?: string }} payload
 */
export async function updateUser(id, payload) {
  const response = await apiFetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Update user failed (${response.status})`);
  }
  return body.data;
}

/**
 * @param {string} id
 * @param {string} newPassword
 */
export async function resetUserPassword(id, newPassword) {
  const response = await apiFetch(`${API_BASE}/users/${id}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Reset password failed (${response.status})`);
  }
  return true;
}

/** @param {string} id */
export async function deleteUser(id) {
  const response = await apiFetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Delete user failed (${response.status})`);
  }
  return true;
}

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
    const response = await apiFetch(`${API_BASE}/categories`);

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
    const response = await apiFetch(`${API_BASE}/categories`, {
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
    const response = await apiFetch(`${API_BASE}/categories/${id}`, {
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
    const response = await apiFetch(`${API_BASE}/categories/${id}`, {
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

    const response = await apiFetch(`${API_BASE}/products?${params}`);

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

    const response = await apiFetch(`${API_BASE}/products?${params}`);

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

    const response = await apiFetch(
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
    const response = await apiFetch(`${API_BASE}/products/${id}`);

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
    const response = await apiFetch(
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
 * Create a new product
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createProduct(payload) {
  try {
    const response = await apiFetch(`${API_BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data ? normalizeProduct(data.data) : null;
  } catch (error) {
    console.error("[API] Failed to create product:", error);
    throw error;
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
    const response = await apiFetch(`${API_BASE}/products/${id}`, {
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
    const response = await apiFetch(`${API_BASE}/products/${id}`, {
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
    const response = await apiFetch(`${API_BASE}/transactions`, {
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
 * Fetch a paginated list of transactions.
 * @param {{ skip?: number, take?: number, startDate?: string, endDate?: string }} options
 * @returns {Promise<{ data: object[], pagination: { skip: number, take: number, total: number } }>}
 */
export async function fetchTransactions(options = {}) {
  try {
    const { skip = 0, take = 20, startDate, endDate } = options;
    const params = new URLSearchParams({ skip, take });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const response = await apiFetch(`${API_BASE}/transactions?${params}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const body = await response.json();
    return {
      data: body.data || [],
      pagination: body.pagination || { skip, take, total: 0 },
    };
  } catch (error) {
    console.error("[API] Failed to fetch transactions:", error);
    return { data: [], pagination: { skip: 0, take: 20, total: 0 } };
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
    const response = await apiFetch(
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
    const response = await apiFetch(`${API_BASE}/payments`, {
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
    const response = await apiFetch(`${API_BASE}/hardware/print-receipt`, {
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
    const response = await apiFetch(`${API_BASE}/health`);

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
    const response = await apiFetch(`${API_BASE}/ai/forecast/${productId}`);

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

    const response = await apiFetch(`${API_BASE}/ai/forecast/batch`, {
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
    const response = await apiFetch(`${API_BASE}/dashboard/overview`);

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

/**
 * Fetch full AI insights payload for the Insights page.
 * @returns {Promise<object>} - { narrative, summary, forecasts, model, apiKeyConfigured }
 */
export async function fetchAIInsights() {
  try {
    const response = await apiFetch(`${API_BASE}/ai/insights`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error("[API] Failed to fetch AI insights:", error);
    return {};
  }
}

/**
 * Fetch the last 10 AI insight narratives for the history timeline.
 * @returns {Promise<Array<object>>}
 */
export async function fetchInsightsHistory() {
  try {
    const response = await apiFetch(`${API_BASE}/ai/insights/history`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("[API] Failed to fetch insights history:", error);
    return [];
  }
}

/**
 * Force a fresh Claude API call bypassing all cost-control gates.
 * Returns the new insight or null; throws on HTTP 429 (rate-limited).
 * @returns {Promise<object|null>}
 */
export async function refreshInsight() {
  const response = await apiFetch(`${API_BASE}/ai/insights/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.message || "Rate limited");
    err.retryAfterSeconds = body.retryAfterSeconds;
    throw err;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Refresh failed (${response.status})`);
  }
  const data = await response.json();
  return data.data || null;
}
