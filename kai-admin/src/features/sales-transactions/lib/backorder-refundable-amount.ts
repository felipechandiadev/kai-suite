import type { SalesTransactionListRow } from "../types/sales-transaction-list.types";

/** Abono no consumido estimado para encargos abiertos (listado). */
export function backorderRefundableAmount(row: SalesTransactionListRow): number {
  const deposit =
    row.backorderDepositAmount != null && row.backorderDepositAmount > 0
      ? row.backorderDepositAmount
      : Math.max(0, Math.round(Number(row.amountPaid) || 0));
  return Math.max(0, Math.round(deposit));
}
