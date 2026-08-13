const rawApiBase = import.meta.env.VITE_API_BASE_URL || "/api";
const API_BASE = rawApiBase.replace(/\/+$/, "");

async function readErrorMessage(res, fallbackMessage) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch (err) {
    try {
      const text = await res.text();
      if (text.trim()) {
        return text;
      }
    } catch (textErr) {
      return fallbackMessage;
    }
  }

  return fallbackMessage;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Login failed"));
  return res.json();
}

export async function resetPassword(payload) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Password reset failed"));
  return res.json();
}

export async function createProduct(token, payload) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Product creation failed"));
  return res.json();
}

export async function listProducts(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/products${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to load products"));
  return res.json();
}

export async function updateProduct(token, productId, payload) {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Product update failed"));
  return res.json();
}

export async function adjustStock(token, payload) {
  const res = await fetch(`${API_BASE}/inventory/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Stock adjustment failed"));
  return res.json();
}

export async function createSale(token, payload) {
  const res = await fetch(`${API_BASE}/billing/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Sale creation failed"));
  return res.json();
}

export async function getMonthlySales(token) {
  const res = await fetch(`${API_BASE}/billing/sales/monthly/current`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch monthly sales"));
  return res.json();
}

export async function getStockAnalysis(token) {
  const res = await fetch(`${API_BASE}/analytics/stock`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch stock analysis"));
  return res.json();
}

export async function getSalesAnalysis(token) {
  const res = await fetch(`${API_BASE}/analytics/sales`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch sales analysis"));
  return res.json();
}

export async function getDashboardAnalysis(token, period = "month") {
  const res = await fetch(`${API_BASE}/analytics/dashboard?period=${encodeURIComponent(period)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch dashboard analysis"));
  return res.json();
}

export async function getCustomersAnalysis(token) {
  const res = await fetch(`${API_BASE}/analytics/customers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to fetch customer analysis"));
  return res.json();
}

export async function updateCustomer(token, originalPhone, payload) {
  const res = await fetch(`${API_BASE}/analytics/customers/${encodeURIComponent(originalPhone)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Customer update failed"));
  return res.json();
}
