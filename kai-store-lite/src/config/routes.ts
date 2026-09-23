export type AppSection = "pos" | "admin";

export const SECTION_LABELS: Record<AppSection, string> = {
  pos: "POS",
  admin: "Admin",
};

/** Admin routes — ventas-only Lite (sin compras / clientes / precios / sucursal). */
export const ADMIN_ROUTES = {
  home: "/admin",
  // Ventas (operación)
  salesTransactions: "/admin/sales/transactions",
  salesPos: "/admin/sales/pos",
  salesCashSessions: "/admin/sales/cash-sessions",
  // Inventario
  catalog: "/admin/catalog",
  catalogProducts: "/admin/catalog/products",
  catalogVariant: (id: string) => `/admin/catalog/products/variants/${id}`,
  inventoryUnits: "/admin/inventory/units",
  inventoryStorages: "/admin/inventory/storages",
  inventoryStock: "/admin/inventory/stock",
  inventoryCategories: "/admin/inventory/categories",
  inventoryAttributes: "/admin/inventory/attributes",
  // Reportes
  reportsSummary: "/admin",
  reportsSales: "/admin/reports/sales",
  // Config
  company: "/admin/settings/company",
  users: "/admin/settings/users",
  printers: "/admin/settings/printers",
  backup: "/admin/settings/backup",
  about: "/admin/settings/about",
} as const;

export const POS_ROUTES = {
  login: "/pos/login",
  opening: "/pos/opening",
  sale: "/pos/sale",
  payment: "/pos/payment",
  closing: "/pos/closing",
} as const;
