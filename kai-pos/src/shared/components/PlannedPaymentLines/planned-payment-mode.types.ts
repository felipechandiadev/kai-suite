/**
 * Modos de planificación de pago compartidos entre compras, nómina y documentos fiscales.
 */
export type PlannedPaymentMode =
  | "PENDING"
  | "PENDING_SCHEDULED"
  | "PARTIAL"
  | "COMPLETED";

export const PLANNED_PAYMENT_MODE_OPTIONS: ReadonlyArray<{
  id: PlannedPaymentMode;
  label: string;
}> = [
  { id: "PENDING", label: "Pago pendiente" },
  { id: "PENDING_SCHEDULED", label: "Pago pendiente con cuotas programadas" },
  { id: "PARTIAL", label: "Pago parcial + saldo en cuotas" },
  { id: "COMPLETED", label: "Pagar ahora" },
] as const;

export function isPlannedPaymentMode(value: string): value is PlannedPaymentMode {
  return PLANNED_PAYMENT_MODE_OPTIONS.some((o) => o.id === value);
}
