// API Client for Mtiririko / iCash FastAPI Backend
function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When running locally, use /api/backend (proxied by Next.js rewrites) or 127.0.0.1:8000
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api/backend";
    }
  }
  return "http://127.0.0.1:8000";
}

const TOKEN_KEY = "icash_auth_token";

export const getStoredToken = () => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const base = getApiBase();
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    // If /api/backend failed (e.g. rewrite caching), fallback to direct http://127.0.0.1:8000
    if (base === "/api/backend") {
      try {
        res = await fetch(`http://127.0.0.1:8000${path}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error(
          "Ma suurtagalin xiriirka backend-ka (Load failed). Hubi in uvicorn main:app uu ku shaqeynayo port 8000."
        );
      }
    } else {
      throw new Error(
        "Ma suurtagalin xiriirka backend-ka (Load failed). Hubi in backend API uu online yahay."
      );
    }
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (res.status === 401) {
    setStoredToken(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("icash:unauthorized"));
    }
    throw new Error(data?.detail || "Email-ka ama furaha sirta ah waa khalad.");
  }

  if (!res.ok) {
    const detail = data?.detail;
    let message = "Codsigu ma guulaysan";
    if (Array.isArray(detail)) {
      message = detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    } else if (typeof detail === "string") {
      message = detail;
    }
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (email, password) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    registerTenant: (tenant_name, full_name, email, password) =>
      request("/auth/register-tenant", {
        method: "POST",
        body: JSON.stringify({ tenant_name, full_name, email, password }),
      }),
    me: () => request("/me"),
  },

  // Workflows & Requests
  workflows: {
    list: () => request("/workflows"),
    create: (workflowData) =>
      request("/workflows", {
        method: "POST",
        body: JSON.stringify(workflowData),
      }),
    newVersion: (workflowId, workflowData) =>
      request(`/workflows/${workflowId}/versions`, {
        method: "POST",
        body: JSON.stringify(workflowData),
      }),
  },

  requests: {
    list: () => request("/requests"),
    create: (workflow_id, data) =>
      request("/requests", {
        method: "POST",
        body: JSON.stringify({ workflow_id, data }),
      }),
  },

  tasks: {
    inbox: () => request("/tasks"),
    act: (taskId, action, comment = null) =>
      request(`/tasks/${taskId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment }),
      }),
  },

  team: {
    listUsers: () => request("/users"),
    addUser: (userData) =>
      request("/users", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
  },

  audit: {
    list: () => request("/audit"),
  },

  // Wholesale / Cash & Carry POS
  pos: {
    getProducts: () => request("/products"),
    createProduct: (data) =>
      request("/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getSuppliers: () => request("/suppliers"),
    createSupplier: (data) =>
      request("/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getCustomers: () => request("/customers"),
    createCustomer: (data) =>
      request("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    receiveStock: (data) =>
      request("/receipts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sell: (data) =>
      request("/sales", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listSales: (limit = 50) => request(`/sales?limit=${limit}`),
    getSale: (id) => request(`/sales/${id}`),
    adjustStock: (data) =>
      request("/adjustments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    closeDay: (day, counted_cash) =>
      request("/day-close", {
        method: "POST",
        body: JSON.stringify({ day, counted_cash }),
      }),
    getSummaryReport: (day) =>
      request(`/reports/summary${day ? `?day=${encodeURIComponent(day)}` : ""}`),
  },
};
