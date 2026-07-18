/**
 * Alineado con el dominio y respuestas de `GET/POST/PUT` de `/api/users`.
 * No persistir `pass` en UI; el backend podría incluirlo en JSON en algunas rutas: ignorar.
 */
export type UserListItem = {
  id: string;
  userName: string;
  mail: string;
  rol: string;
  companyId?: string | null;
  isOwner?: boolean;
  memberships?: Array<{
    companyId: string;
    roles: string[];
    isOwner: boolean;
  }>;
  personId?: string | null;
  person?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    documentNumber?: string | null;
    documentType?: string | null;
  } | null;
};

export type ListUsersResult =
  | { success: true; users: UserListItem[] }
  | { success: false; error: string; users: [] };

export type CreateUserResult =
  | { success: true; data: UserListItem }
  | { success: false; error: string };

export type UpdateUserResult =
  | { success: true; data: UserListItem }
  | { success: false; error: string };

export type DeleteUserResult = { success: true } | { success: false; error: string };

export const USER_ROLE_OPTIONS: { id: string; label: string }[] = [
  { id: "POS_OPERATOR", label: "Operador POS" },
  { id: "ADMIN", label: "Administrador" },
  { id: "SUB_ADMIN", label: "Subadministrador" },
  { id: "COURIER", label: "Repartidor" },
  { id: "WAITER", label: "Mesero" },
  { id: "STOCK_OPERATOR", label: "Operador de stock" },
  { id: "KDS_OPERATOR", label: "Operador KDS" },
];

export const OPERATIONAL_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter((o) =>
  ["POS_OPERATOR", "COURIER", "WAITER", "STOCK_OPERATOR", "KDS_OPERATOR"].includes(
    o.id,
  ),
);

export const GOVERNANCE_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter((o) =>
  ["ADMIN", "SUB_ADMIN"].includes(o.id),
);

export function isGovernanceRole(rol: string): boolean {
  const code = normalizeUserRole(rol);
  return code === "ADMIN" || code === "SUB_ADMIN" || code === "SUPER_ADMIN";
}

export function isOperationalRole(rol: string): boolean {
  const code = normalizeUserRole(rol);
  return OPERATIONAL_ROLE_OPTIONS.some((o) => o.id === code);
}

/** Rol legacy singular desde roles de membership (dual-write). */
export function primaryLegacyRoleFromMembershipRoles(roles: string[]): string {
  const set = new Set(roles.map(normalizeUserRole));
  if (set.has("ADMIN")) return "ADMIN";
  if (set.has("SUB_ADMIN")) return "SUB_ADMIN";
  if (set.has("POS_OPERATOR")) return "POS_OPERATOR";
  if (set.has("COURIER")) return "COURIER";
  if (set.has("WAITER")) return "WAITER";
  if (set.has("STOCK_OPERATOR")) return "STOCK_OPERATOR";
  if (set.has("KDS_OPERATOR")) return "KDS_OPERATOR";
  return "POS_OPERATOR";
}

export function normalizeUserRole(rol: string): string {
  if (rol === "USER" || rol === "MANAGER" || rol === "OPERATOR") {
    return "POS_OPERATOR";
  }
  return rol;
}

export function roleLabel(rol: string): string {
  const code = normalizeUserRole(rol);
  return USER_ROLE_OPTIONS.find((o) => o.id === code)?.label ?? code;
}

/** Apps visibles en card (matriz de acceso por rol). */
const APP_ACCESS: { id: string; label: string; roles: string[] }[] = [
  { id: "admin", label: "Admin", roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN"] },
  { id: "pos", label: "POS", roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "POS_OPERATOR"] },
  {
    id: "delivery",
    label: "Delivery",
    roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "COURIER"],
  },
  {
    id: "waiter",
    label: "Waiter",
    roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "WAITER"],
  },
  {
    id: "stock",
    label: "Stock",
    roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "STOCK_OPERATOR"],
  },
  {
    id: "kds",
    label: "KDS",
    roles: ["SUPER_ADMIN", "ADMIN", "SUB_ADMIN", "KDS_OPERATOR"],
  },
];

export function appsAccessibleByRoles(roles: string[]): string[] {
  const set = new Set(roles.map(normalizeUserRole));
  return APP_ACCESS.filter((app) => app.roles.some((r) => set.has(r))).map(
    (app) => app.label,
  );
}

/** Roles efectivos para la empresa activa (membership) o fallback a `rol` legacy. */
export function effectiveRolesForUser(
  user: UserListItem,
  activeCompanyId?: string | null,
): string[] {
  const memberships = user.memberships ?? [];
  const active =
    activeCompanyId != null && activeCompanyId !== ""
      ? memberships.find((m) => m.companyId === activeCompanyId)
      : memberships[0];
  if (active?.roles?.length) {
    return [...new Set(active.roles.map(normalizeUserRole))];
  }
  if (memberships.length > 0) {
    return [...new Set(memberships.flatMap((m) => m.roles.map(normalizeUserRole)))];
  }
  return [normalizeUserRole(user.rol)];
}

export function isOwnerInActiveCompany(
  user: UserListItem,
  activeCompanyId?: string | null,
): boolean {
  const memberships = user.memberships ?? [];
  if (activeCompanyId != null && activeCompanyId !== "") {
    const m = memberships.find((x) => x.companyId === activeCompanyId);
    if (m) return m.isOwner;
  }
  return user.isOwner === true || memberships.some((m) => m.isOwner);
}
