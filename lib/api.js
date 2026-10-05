// API Client for Mtiririko / iCash FastAPI Backend
function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When running locally, use /api/backend (proxied by Next.js rewrites)
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api/backend";
    }
  }
  return "http://127.0.0.1:8000";
}

const TOKEN_KEY = "icash_auth_token";
const DEMO_KEY = "icash_offline_demo";

export const isDemoMode = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_KEY) === "true";
};

export const enableDemoMode = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_KEY, "true");
  setStoredToken("demo_preview_token_2026");
};

export const disableDemoMode = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_KEY);
  setStoredToken(null);
};

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

// Realistic mock data for offline demo mode
const DEMO_PRODUCTS = [
  { id: 1, name: "Bariis Basmati Premium (50kg)", sku: "RICE-50K", unit: "bags", qty: 120, sellable: 110, value: 55000, sell_price: 620, cost_price: 500, next_expiry: "2027-06-30", low: false, expired_qty: 0, expiring_soon: false },
  { id: 2, name: "Sonkor Brazilian Sugar (50kg)", sku: "SUG-50K", unit: "bags", qty: 85, sellable: 85, value: 38250, sell_price: 520, cost_price: 450, next_expiry: "2027-08-15", low: false, expired_qty: 0, expiring_soon: false },
  { id: 3, name: "Saliid Cad Pure Cooking Oil (20L)", sku: "OIL-20L", unit: "cans", qty: 65, sellable: 60, value: 26000, sell_price: 480, cost_price: 400, next_expiry: "2026-12-31", low: false, expired_qty: 0, expiring_soon: false },
  { id: 4, name: "Caano Boore Nido Full Cream (2.5kg)", sku: "MILK-2.5", unit: "tins", qty: 150, sellable: 145, value: 45000, sell_price: 360, cost_price: 300, next_expiry: "2026-11-20", low: false, expired_qty: 0, expiring_soon: true },
  { id: 5, name: "Baasto Daawa Pasta (10kg Carton)", sku: "PASTA-10K", unit: "cartons", qty: 200, sellable: 190, value: 30000, sell_price: 210, cost_price: 150, next_expiry: "2027-03-10", low: false, expired_qty: 0, expiring_soon: false },
  { id: 6, name: "Biyo Safe Drinking Water (12x1L)", sku: "WTR-12L", unit: "packs", qty: 300, sellable: 300, value: 15000, sell_price: 75, cost_price: 50, next_expiry: "2027-09-01", low: false, expired_qty: 0, expiring_soon: false },
];

const DEMO_CUSTOMERS = [
  { id: 1, name: "Tukaan Barwaaqo (Bakaara)", phone: "+252615000111", kind: "Wholesale Retailer" },
  { id: 2, name: "Supermarket Salaam (Hodan)", phone: "+252615000222", kind: "Supermarket" },
  { id: 3, name: "Hotel Somali Star (Waberi)", phone: "+252615000333", kind: "Commercial HORECA" },
];

const DEMO_SUPPLIERS = [
  { id: 1, name: "Oma Food Importers Ltd", phone: "+252615999000" },
  { id: 2, name: "Mogadishu Grain & Sugar Mills", phone: "+252615888777" },
];

const DEMO_USER = {
  id: 1,
  tenant_id: 1,
  email: "testadmin@acme.co.ke",
  full_name: "Demo Admin (iCash)",
  roles: ["Admin", "Requester", "Manager", "Finance", "Cashier", "Storekeeper", "Sales", "Warehouse"],
};

async function request(path, options = {}) {
  // If explicitly in offline demo mode, respond with mock data immediately
  if (isDemoMode()) {
    return handleDemoRequest(path, options);
  }

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
    // If on localhost and /api/backend failed, try direct 127.0.0.1:8000
    if (base === "/api/backend") {
      try {
        res = await fetch(`http://127.0.0.1:8000${path}`, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error(
          "Backend-ka offline ayuu yahay. Hubi in uvicorn uu shaqeynayo ama ku gal 'Demo Mode' toos ah."
        );
      }
    } else {
      throw new Error(
        "Backend-ka offline ayuu yahay. Hubi in backend API uu shaqeynayo ama ku gal 'Demo Mode' toos ah."
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

function handleDemoRequest(path, options = {}) {
  if (path === "/me") return DEMO_USER;
  if (path === "/auth/login") return { token: "demo_preview_token_2026" };
  if (path === "/auth/register-tenant") return { token: "demo_preview_token_2026" };
  if (path === "/products") return DEMO_PRODUCTS;
  if (path === "/customers") return DEMO_CUSTOMERS;
  if (path === "/suppliers") return DEMO_SUPPLIERS;
  if (path.startsWith("/sales")) {
    if (options.method === "POST") return { id: 1042, total: 14500 };
    return [{ id: 1041, total: 12500, method: "cash", date: new Date().toISOString() }];
  }
  if (path === "/receipts") return { id: 201, status: "received", created_at: new Date().toISOString() };
  if (path === "/adjustments") return { id: 301, status: "adjusted" };
  if (path === "/day-close") return { status: "closed", message: "Day closed successfully" };
  if (path.startsWith("/tasks")) {
    if (options.method === "POST") return { status: "completed" };
    return [
      {
        id: 1,
        request_id: 101,
        step: "Approval: Credit Limit Override",
        role: "Manager",
        due_at: new Date(Date.now() + 3600000).toISOString(),
        overdue: false,
        data: { Customer: "Tukaan Barwaaqo", Amount: "KES 45,000", Reason: "Urgent wholesale restocking" }
      }
    ];
  }
  if (path === "/requests") return [
    {
      id: 101,
      workflow: "Credit Limit Approval",
      status: "running",
      created_at: new Date().toISOString(),
      data: { Customer: "Tukaan Barwaaqo", Amount: "KES 45,000" },
      steps: [
        { name: "Submission", state: "done", role: "Requester" },
        { name: "Manager Approval", state: "current", role: "Manager" },
        { name: "Finance Release", state: "pending", role: "Finance" }
      ]
    }
  ];
  if (path === "/workflows") return [
    { id: 1, name: "Credit Limit Approval", version: 1, fields: [] },
    { id: 2, name: "Stock Write-Off Approval", version: 1, fields: [] }
  ];
  if (path.startsWith("/reports/summary")) {
    return {
      date: new Date().toISOString().split("T")[0],
      sales_total: 84500,
      sales_count: 14,
      cash_sales: 52000,
      mpesa_sales: 32500,
      closed: false
    };
  }
  if (path === "/users") return [
    { id: 1, email: "testadmin@acme.co.ke", full_name: "Demo Admin", roles: ["Admin", "Manager"] },
    { id: 2, email: "cashier@acme.co.ke", full_name: "Faadumo Axmed", roles: ["Cashier"] }
  ];
  if (path === "/audit") return [
    { action: "login", entity: "user", entity_id: 1, at: new Date().toISOString(), detail: { ip: "127.0.0.1" } }
  ];
  return {};
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
