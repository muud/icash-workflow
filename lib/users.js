// Demo users. Edit freely; replace with real auth and a database later.
const PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || "demo123";

export const USERS = [
  { username: "admin", password: PASSWORD, role: "Admin" },
  { username: "sales", password: PASSWORD, role: "Sales" },
  { username: "finance", password: PASSWORD, role: "Finance" },
  { username: "warehouse", password: PASSWORD, role: "Warehouse" },
];

export const ROLES = ["Sales", "Finance", "Warehouse", "Admin"];
