import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";

/** Etiqueta de columna / resumen cuando hay varios medios (no es enum de BD). */
export function formatMultiPaymentLabel(count: number): string {
  if (count < 2) return "Varios medios";
  return `Varios (${count})`;
}

export function countPaymentSnapshotsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): number {
  if (!metadata || typeof metadata !== "object") return 0;
  const payments = metadata.payments;
  if (Array.isArray(payments) && payments.length > 0) {
    return payments.filter(
      (p) => p && typeof p === "object" && Number((p as { amount?: unknown }).amount) > 0,
    ).length;
  }
  const snapshots = metadata.paymentSnapshots;
  if (Array.isArray(snapshots) && snapshots.length > 0) {
    return snapshots.filter(
      (p) => p && typeof p === "object" && Number((p as { amount?: unknown }).amount) > 0,
    ).length;
  }
  const details = metadata.paymentDetails;
  if (Array.isArray(details) && details.length > 0) {
    return details.filter(
      (p) =>
        p && typeof p === "object" && Number((p as { amount?: unknown }).amount) > 0,
    ).length;
  }
  return 0;
}

export function formatSalePaymentMethodDisplay(
  paymentMethod: string,
  paymentLinesCount?: number,
): string {
  const count = paymentLinesCount ?? 0;
  if (count > 1) {
    return formatMultiPaymentLabel(count);
  }
  const key = paymentMethod as SalesPaymentMethod;
  if (key && key in SALES_PAYMENT_METHOD_LABEL) {
    return SALES_PAYMENT_METHOD_LABEL[key];
  }
  return paymentMethod?.trim() || "—";
}
