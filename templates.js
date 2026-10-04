// Starter workflows for a cash and carry wholesaler.
export const TEMPLATES = [
  {
    id: "t1",
    name: "Credit account approval",
    steps: [
      { title: "Review application", role: "Sales" },
      { title: "Credit check", role: "Finance" },
      { title: "Final approval", role: "Admin" },
    ],
  },
  {
    id: "t2",
    name: "Stock receiving",
    steps: [
      { title: "Check delivery against PO", role: "Warehouse" },
      { title: "Approve invoice", role: "Finance" },
    ],
  },
];
