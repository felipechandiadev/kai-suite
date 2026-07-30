import type {
  AccountsPayableOriginCategory,
  AccountsPayablePayeeType,
  AccountsPayablePaymentType,
  AccountsPayableSourceType,
  AccountsPayableStatus,
} from "../types/accounts-payable.types";

export const ACCOUNTS_PAYABLE_ORIGIN_CATEGORY_LABELS: Record<
  AccountsPayableOriginCategory | string,
  string
> = {
  PURCHASE: "Compra",
  OPERATING_EXPENSE: "Gasto operativo",
  PAYROLL: "Nómina",
  OTHER: "Otro",
};

export const ACCOUNTS_PAYABLE_SOURCE_TYPE_LABELS: Record<
  AccountsPayableSourceType | string,
  string
> = {
  ...ACCOUNTS_PAYABLE_ORIGIN_CATEGORY_LABELS,
};

export const ACCOUNTS_PAYABLE_PAYMENT_TYPE_LABELS: Record<
  AccountsPayablePaymentType | string,
  string
> = {
  SUPPLIER_PAYMENT: "Compra",
  PAYROLL_PAYMENT: "Nómina",
  EXPENSE_PAYMENT: "Gasto operativo",
};

export const ACCOUNTS_PAYABLE_STATUS_LABELS: Record<
  AccountsPayableStatus | string,
  string
> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  OVERDUE: "Vencida",
  PAID: "Pagada",
};

export const ACCOUNTS_PAYABLE_PAYEE_TYPE_LABELS: Record<
  AccountsPayablePayeeType | string,
  string
> = {
  SUPPLIER: "Proveedor",
  EMPLOYEE: "Empleado",
  OTHER: "Otro",
};

export function labelAccountsPayableOriginCategory(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_ORIGIN_CATEGORY_LABELS[value] ?? value;
}

export function labelAccountsPayableSourceType(value: string | null | undefined): string {
  return labelAccountsPayableOriginCategory(value);
}

export function resolveAccountsPayableOriginCategoryFromRow(row: {
  originCategory?: string | null;
  sourceType?: string | null;
  paymentType?: string | null;
}): AccountsPayableOriginCategory | string {
  const fromOrigin = row.originCategory?.trim();
  if (fromOrigin) return fromOrigin;
  const fromSource = row.sourceType?.trim();
  if (fromSource) return fromSource;
  if (row.paymentType === "PAYROLL_PAYMENT") return "PAYROLL";
  if (row.paymentType === "EXPENSE_PAYMENT") return "OPERATING_EXPENSE";
  if (row.paymentType === "SUPPLIER_PAYMENT") return "PURCHASE";
  return "OTHER";
}

export function labelAccountsPayablePaymentType(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_PAYMENT_TYPE_LABELS[value] ?? value;
}

export function labelAccountsPayableStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_STATUS_LABELS[value] ?? value;
}

export function labelAccountsPayablePayeeType(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_PAYEE_TYPE_LABELS[value] ?? value;
}
