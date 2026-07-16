import {
  POS_PAYMENT_METHOD_IDS,
  type PosPaymentMethodId,
} from "@/features/pos-cart/pos-payment.types";

/** Etiquetas en español para enums de medio de pago (backend / POS). */
const PAYMENT_METHOD_LABEL_ES: Record<string, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  VOUCHER: "Voucher",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito cliente",
  ORDER_ADVANCE: "Abono por encargo",
  MIXED: "Varios medios",
  INTERNAL_CREDIT: "Crédito interno",
  CREDIT: "Crédito",
};

/** Etiqueta del campo monto en pantalla de pago POS (p. ej. «Monto efectivo»). */
export function paymentAmountFieldLabel(methodLabel: string | null | undefined): string {
  const trimmed = methodLabel?.trim();
  if (!trimmed) return "Monto";
  return `Monto ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

/** Medio de pago legible para listados y comprobantes. */
export function paymentMethodLabelEs(
  method: string | null | undefined,
  preferredLabel?: string | null,
): string {
  const custom = preferredLabel?.trim();
  if (custom) return custom;

  const key = String(method ?? "")
    .trim()
    .toUpperCase();
  if (!key) return "—";

  const mapped = PAYMENT_METHOD_LABEL_ES[key];
  if (mapped) return mapped;

  if ((POS_PAYMENT_METHOD_IDS as readonly string[]).includes(key)) {
    return PAYMENT_METHOD_LABEL_ES[key as PosPaymentMethodId] ?? key;
  }

  return key
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
