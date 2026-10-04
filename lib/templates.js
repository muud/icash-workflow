// Pre-configured Starter Templates for Cash and Carry Wholesale
export const TEMPLATES = [
  {
    name: "Credit account approval",
    fields: [
      { key: "customer_name", label: "Business Name", type: "text", required: true },
      { key: "requested_limit", label: "Requested Credit Limit (KES)", type: "number", required: true },
      { key: "payment_terms_days", label: "Payment Terms (Days)", type: "number", required: true },
      { key: "business_type", label: "Business Type", type: "select", options: ["Retailer", "Hotel", "Restaurant", "Supermarket"], required: true },
    ],
    steps: [
      { name: "Review application", type: "approval", role: "Sales", due_hours: 24 },
      { name: "Credit check", type: "approval", role: "Finance", due_hours: 48 },
      { name: "Executive sign-off", type: "approval", role: "Admin", due_hours: 24 },
      { name: "Account activated", type: "notify" },
    ],
    transitions: [
      // If credit limit <= 100,000 KES, skip Finance credit check and go directly to Executive sign-off
      { from_pos: 0, to_pos: 2, condition: { field: "requested_limit", op: "<=", value: 100000 }, priority: 0 },
    ],
  },
  {
    name: "Stock receiving & inspection",
    fields: [
      { key: "supplier", label: "Supplier Name", type: "text", required: true },
      { key: "invoice_ref", label: "Supplier Invoice / Delivery Note #", type: "text", required: true },
      { key: "total_value", label: "Invoice Amount (KES)", type: "number", required: true },
      { key: "notes", label: "Inspection Notes", type: "text", required: false },
    ],
    steps: [
      { name: "Verify goods & physical count", type: "task", role: "Warehouse", due_hours: 12 },
      { name: "Invoice price & variance check", type: "approval", role: "Finance", due_hours: 24 },
      { name: "Inventory entered", type: "notify" },
    ],
    transitions: [],
  },
  {
    name: "Purchase requisition",
    fields: [
      { key: "item", label: "Item Description", type: "text", required: true },
      { key: "amount_kes", label: "Estimated Total (KES)", type: "number", required: true },
      { key: "department", label: "Department", type: "text", required: true },
    ],
    steps: [
      { name: "Manager approval", type: "approval", role: "Manager", due_hours: 24 },
      { name: "Finance budget review", type: "approval", role: "Finance", due_hours: 48 },
      { name: "Procurement order placed", type: "task", role: "Storekeeper", due_hours: 24 },
    ],
    transitions: [
      // If requisition <= 50,000 KES, skip Finance and go straight to storekeeper
      { from_pos: 0, to_pos: 2, condition: { field: "amount_kes", op: "<=", value: 50000 }, priority: 0 },
    ],
  },
];
