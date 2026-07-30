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

export const TX_TYPE_LABEL: Record<string, string> = {
  SALE: "Venta",
  BACKORDER: "Encargo",
  PURCHASE: "Compra",
  PAYMENT_IN: "Cobro",
  SALE_RETURN: "Devolución",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito",
  CUSTOMER_CREDIT_NOTE_PAYOUT: "Devolución saldo NC",
};

export {
  CREDIT_NOTE_USAGE_LABEL,
  creditNoteUsageVariant,
} from "@/features/sales-transactions/lib/credit-note-usage-status";
