import { NavLink } from "react-router-dom";
import { ADMIN_ROUTES } from "@/config/routes";

type NavItem = { to: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Ventas",
    items: [
      { to: ADMIN_ROUTES.salesTransactions, label: "Transacciones" },
      { to: ADMIN_ROUTES.salesCashSessions, label: "Sesiones de caja" },
    ],
  },
  {
    label: "Inventario y catálogo",
    items: [
      { to: ADMIN_ROUTES.catalogProducts, label: "Catálogo" },
      { to: ADMIN_ROUTES.inventoryCategories, label: "Categorías" },
      { to: ADMIN_ROUTES.inventoryAttributes, label: "Atributos" },
      { to: ADMIN_ROUTES.inventoryUnits, label: "Unidades" },
      { to: ADMIN_ROUTES.inventoryStorages, label: "Almacenes" },
      { to: ADMIN_ROUTES.inventoryStock, label: "Existencias" },
    ],
  },
  {
    label: "Reportes",
    items: [
      { to: ADMIN_ROUTES.reportsSummary, label: "Resumen" },
      { to: ADMIN_ROUTES.reportsSales, label: "Ventas" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { to: ADMIN_ROUTES.company, label: "Empresa" },
      { to: ADMIN_ROUTES.salesPos, label: "Punto de venta" },
      { to: ADMIN_ROUTES.users, label: "Usuarios" },
      { to: ADMIN_ROUTES.printers, label: "Impresión" },
      { to: ADMIN_ROUTES.backup, label: "Backup" },
      { to: ADMIN_ROUTES.about, label: "Acerca de" },
    ],
  },
];

export function AdminSidebar() {
  return (
    <nav
      aria-label="Admin"
      className="fs-app-sidebar flex h-full w-[var(--app-sidebar-width)] shrink-0 flex-col gap-3 overflow-auto p-3 text-sm"
    >
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </div>
          <div className="ml-2 flex flex-col gap-0.5 border-l border-border/70 pl-2">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ADMIN_ROUTES.reportsSummary}
                className={({ isActive }) =>
                  [
                    "block rounded-md px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-hover hover:text-foreground",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
