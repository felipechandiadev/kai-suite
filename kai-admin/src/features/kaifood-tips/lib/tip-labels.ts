import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import type { TipDistributionMode } from "../types/company-tips.types";

/** Estado del asiento de propina (ledger). */
export const TIP_LEDGER_STATUS_LABEL: Record<string, string> = {
  ACCRUED: "Pendiente de pago",
  PAID: "Pagada",
  VOID: "Anulada",
};

/** Estado de captura en el cobro. */
export const TIP_CAPTURE_STATUS_LABEL: Record<string, string> = {
  NONE: "Sin captura",
  SUGGESTED: "Sugerida",
  ACCEPTED: "Aceptada",
  CUSTOM: "Personalizada",
  DECLINED: "Rechazada",
};

export const TIP_DISTRIBUTION_MODE_OPTIONS: Array<{
  id: TipDistributionMode;
  label: string;
}> = [
  { id: "NONE", label: "Sin distribución (solo captura)" },
  { id: "DIRECT", label: "Directo al mesero" },
  { id: "POOL", label: "Pozo" },
  { id: "POINTS", label: "Puntos" },
];

export function tipLedgerStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? "")
    .trim()
    .toUpperCase();
  return TIP_LEDGER_STATUS_LABEL[key] ?? (key || "—");
}

export function tipCaptureStatusLabel(status: string | null | undefined): string {
  const key = String(status ?? "")
    .trim()
    .toUpperCase();
  return TIP_CAPTURE_STATUS_LABEL[key] ?? (key || "—");
}

export function tipPaymentMethodLabel(
  method: string | null | undefined,
): string {
  const key = String(method ?? "")
    .trim()
    .toUpperCase();
  if (!key) return "—";
  if (key in SALES_PAYMENT_METHOD_LABEL) {
    return SALES_PAYMENT_METHOD_LABEL[key as SalesPaymentMethod];
  }
  if (key === "CARD") return "Tarjeta";
  return key;
}

export function formatTipClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatTipDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatTipDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const dt = new Date(value.trim());
  if (Number.isNaN(dt.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}
