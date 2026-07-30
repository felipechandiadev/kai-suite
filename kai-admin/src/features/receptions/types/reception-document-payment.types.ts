/**
 * Plan de pago del documento fiscal (factura/boleta) asociado a una recepción directa.
 * Se envía en `supplierDocumentPayment` al crear la recepción.
 */
import type { PlannedPaymentMode } from "@/shared/components/PlannedPaymentLines/planned-payment-mode.types";

export type ReceptionDocumentPaymentMode = PlannedPaymentMode;

export type ReceptionPlannedPaymentLinePayload = {
  dueDate: string;
  amount: number;
  /** Solo en pagos ejecutados al momento; omitir en cuotas programadas. */
  paymentMethod?: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  /** Admin: centro de acopio si `paymentMethod === "CASH"`. */
  cashHubId?: string | null;
  /** POS: sesión de caja si el pago en efectivo sale del cajón. */
  cashSessionId?: string | null;
};

export type ReceptionSupplierDocumentPaymentPayload = {
  mode: ReceptionDocumentPaymentMode;
  /** Solo modo PARTIAL: monto ya pagado (debe coincidir con la suma de `paidLines`). */
  partialPaidAmount?: number;
  /** Abonos ya ejecutados al momento de la recepción (PARTIAL o COMPLETED en un pago). */
  paidLines: ReceptionPlannedPaymentLinePayload[];
  /** Cuotas / saldo a pagar a futuro (PENDING_SCHEDULED, PARTIAL con saldo, o vacío). */
  scheduledLines: ReceptionPlannedPaymentLinePayload[];
};

function paymentMethodLabel(method: string | undefined): string | null {
  if (!method) return null;
  if (method === "CASH") return "Efectivo";
  if (method === "TRANSFER") return "Transferencia";
  if (method === "CHECK") return "Cheque";
  return null;
}

export function formatReceptionPaymentSummary(payload: ReceptionSupplierDocumentPaymentPayload | null): string {
  if (!payload) {
    return "";
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(Number(n) || 0),
    );
  const lineStr = (prefix: string, lines: ReceptionPlannedPaymentLinePayload[], includeMethod: boolean) => {
    if (!lines.length) {
      return "";
    }
    const parts = lines.map((l, i) => {
      const m = includeMethod ? paymentMethodLabel(l.paymentMethod) : null;
      const methodPart = m ? ` · ${m}` : "";
      return `${i + 1}) ${fmt(l.amount)}${methodPart} · vence ${l.dueDate}`;
    });
    return `${prefix}: ${parts.join(" | ")}`;
  };
  switch (payload.mode) {
    case "PENDING":
      return "Pago documento: pendiente (sin plan detallado).";
    case "PENDING_SCHEDULED":
      return `Pago documento: pendiente con cuotas. ${lineStr("Cuotas", payload.scheduledLines, false)}`.trim();
    case "PARTIAL":
      return `Pago documento: parcial (${fmt(payload.partialPaidAmount ?? 0)} abonado). ${lineStr("Abonado", payload.paidLines, true)} ${lineStr("Pendiente", payload.scheduledLines, false)}`.trim();
    case "COMPLETED":
      return `Pago documento: pagado. ${lineStr("Pago", payload.paidLines, true)}`.trim();
    default:
      return "";
  }
}
