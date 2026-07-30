import type {
  AccountsReceivableOriginCategory,
  AccountsReceivableStatus,
} from "../types/accounts-receivable.types";

export const ACCOUNTS_RECEIVABLE_ORIGIN_CATEGORY_LABELS: Record<
  AccountsReceivableOriginCategory | string,
  string
> = {
  INSTALLMENT: "Cuota de venta",
};

export const ACCOUNTS_RECEIVABLE_STATUS_LABELS: Record<
  AccountsReceivableStatus | string,
  string
> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  OVERDUE: "Vencida",
  PAID: "Cobrada",
};

export function labelAccountsReceivableOriginCategory(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return ACCOUNTS_RECEIVABLE_ORIGIN_CATEGORY_LABELS[value] ?? value;
}

export function labelAccountsReceivableStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_RECEIVABLE_STATUS_LABELS[value] ?? value;
}
