/** `paymentStatus` de documentos fiscales de compra (factura, boleta, etc.). */
export type SupplierDocumentPaymentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOIDED";

export const SUPPLIER_DOCUMENT_PAYMENT_STATUS_LABEL: Record<
  SupplierDocumentPaymentStatus | string,
  string
> = {
  PENDING: "Pendiente",
  PARTIAL: "Pago parcial",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  VOIDED: "Anulado",
};

export function labelSupplierDocumentPaymentStatus(
  value: string | null | undefined,
): string {
  const key = value?.trim().toUpperCase();
  if (!key) return "—";
  return SUPPLIER_DOCUMENT_PAYMENT_STATUS_LABEL[key] ?? value ?? "—";
}

/** Etiqueta de pago; si falta `paymentStatus`, infiere por montos (filas antiguas). */
export function supplierDocumentPaymentStatusDisplay(input: {
  paymentStatus?: string | null;
  total?: number;
  amountPaid?: number;
}): string {
  const labeled = labelSupplierDocumentPaymentStatus(input.paymentStatus);
  if (input.paymentStatus?.trim()) {
    return labeled;
  }
  const total = Math.round(Number(input.total) || 0);
  const paid = Math.round(Number(input.amountPaid) || 0);
  if (total <= 0) return "—";
  if (paid >= total - 1) return labelSupplierDocumentPaymentStatus("PAID");
  if (paid > 0) return labelSupplierDocumentPaymentStatus("PARTIAL");
  return labelSupplierDocumentPaymentStatus("PENDING");
}
