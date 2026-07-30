import type { CustomerCreditNoteUsageStatus } from "../types/pos-customer-detail.types";

export function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCustomerDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function documentTypeLabel(raw: string | null | undefined): string {
  const u = (raw ?? "").trim().toUpperCase();
  if (u === "RUN" || u === "RUT") return "RUT";
  if (u === "PASSPORT") return "Pasaporte";
  if (u === "DNI" || u === "OTHER") return "Otro";
  return raw?.trim() || "Documento";
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  VOIDED: "Anulado",
};

export function paymentStatusVariant(
  status: string | null | undefined,
): "success-outlined" | "warning-outlined" | "secondary-outlined" | "error-outlined" {
  const u = (status ?? "").trim().toUpperCase();
  if (u === "PAID") return "success-outlined";
  if (u === "PENDING" || u === "PARTIAL" || u === "OVERDUE") return "warning-outlined";
  if (u === "VOIDED") return "error-outlined";
  return "secondary-outlined";
}

export {
  POS_TRANSACTION_TYPE_LABEL as TX_TYPE_LABEL,
  posTransactionTypeLabel,
} from "@/features/transactions/lib/pos-transaction-type-label";

export const CREDIT_NOTE_USAGE_LABEL: Record<CustomerCreditNoteUsageStatus, string> = {
  available: "Disponible",
  partially_used: "Utilizada parcialmente",
  fully_used: "Utilizada",
};

export function creditNoteUsageVariant(
  status: CustomerCreditNoteUsageStatus,
): "success-outlined" | "warning-outlined" | "secondary-outlined" {
  if (status === "available") return "success-outlined";
  if (status === "partially_used") return "warning-outlined";
  return "secondary-outlined";
}
