/** Valores alineados con `ExpenseCategoryOperationalGroup` en backend. */
export type ExpenseCategoryOperationalGroupValue =
  | "PERSONAL_NOMINA"
  | "LOCALES_INSTALACIONES"
  | "SUMINISTROS_CONSUMIBLES"
  | "LOGISTICA_DISTRIBUCION"
  | "TECNOLOGIA_SISTEMAS"
  | "COMUNICACION_MARKETING_OPERATIVO"
  | "SERVICIOS_EXTERNOS"
  | "FINANCIEROS_TESORERIA"
  | "PERDIDAS_AJUSTES_OPERATIVOS"
  | "REGULATORIO_CUMPLIMIENTO";

/** Valores alineados con `ExpenseCategoryPnlNature` en backend. */
export type ExpenseCategoryPnlNatureValue = "SALES" | "ADMIN";

export type OperationalGroupMetaItem = {
  value: ExpenseCategoryOperationalGroupValue;
  label: string;
  description: string;
};

export type PnlNatureMetaItem = {
  value: ExpenseCategoryPnlNatureValue;
  label: string;
  description: string;
};

/** Catálogo cerrado P&L (espejo de backend `EXPENSE_CATEGORY_PNL_NATURE_META`). */
export const EXPENSE_CATEGORY_PNL_NATURE_META: readonly PnlNatureMetaItem[] = [
  {
    value: "SALES",
    label: "Gastos de ventas",
    description:
      "Egresos para concretar o entregar la venta (comisiones de pasarela, marketing, envíos al cliente, POS en punto de venta, etc.).",
  },
  {
    value: "ADMIN",
    label: "Gastos de administración",
    description:
      "Egresos para mantener la empresa funcionando aunque no haya ventas (arriendo, servicios, software, contabilidad, nómina admin, etc.).",
  },
] as const;

export type ExpenseCategoryListItem = {
  id: string;
  companyId: string;
  /** Puede ser null si el registro es legacy; en altas nuevas el backend siempre asigna código. */
  code: string | null;
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
  pnlNature: ExpenseCategoryPnlNatureValue;
  description: string | null;
  requiresApproval: boolean;
  approvalThreshold: number;
  defaultResultCenterId: string | null;
  defaultResultCenterName: string | null;
  isActive: boolean;
  /** Categorías de sistema (nómina base): no se pueden eliminar. */
  nonDeletable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListExpenseCategoriesResult =
  | { success: true; rows: ExpenseCategoryListItem[] }
  | { success: false; error: string; rows: [] };

export type CreateExpenseCategoryResult =
  | { success: true; category: ExpenseCategoryListItem }
  | { success: false; error: string };

export type UpdateExpenseCategoryResult =
  | { success: true; category: ExpenseCategoryListItem }
  | { success: false; error: string };

export type DeleteExpenseCategoryResult = { success: true } | { success: false; error: string };
