/** Estado de cobro de una venta (`paymentStatus` o derivado de montos). */
export type SaleCollectionStatus =
  | "PAID"
  | "PENDING"
  | "PARTIAL"
  | "OVERDUE"
  | "VOIDED"
  | "UNKNOWN";

export const SALE_COLLECTION_STATUS_LABEL: Record<SaleCollectionStatus, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  OVERDUE: "Vencido",
  VOIDED: "Anulado",
  UNKNOWN: "—",
};

/** Tolerancia CLP al comparar montos (redondeos). */
const CLP_TOLERANCE = 1;

export function resolveSaleCollectionStatus(input: {
  paymentStatus?: string | null;
  total: number;
  amountPaid: number;
}): SaleCollectionStatus {
  const raw = input.paymentStatus?.trim().toUpperCase();
  const total = Math.round(Number(input.total) || 0);
  const paid = Math.round(Number(input.amountPaid) || 0);

  if (raw === "VOIDED") return "VOIDED";
  if (total <= 0) return "UNKNOWN";

  // Cobertura por montos primero: el vuelto hace `amountPaid` > `total` en BD legacy.
  if (paid >= total - CLP_TOLERANCE) return "PAID";
  if (paid > CLP_TOLERANCE) return "PARTIAL";
  if (raw === "OVERDUE") return "OVERDUE";
  if (raw === "PENDING") return "PENDING";
  if (raw === "PARTIAL") return "PARTIAL";
  if (raw === "PAID") return "PAID";
  return "PENDING";
}
