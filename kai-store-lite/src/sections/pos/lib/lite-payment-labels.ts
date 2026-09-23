export const LITE_PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
};

export const LITE_FALLBACK_METHODS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
];

export function litePaymentLabel(method: string): string {
  return LITE_PAYMENT_LABELS[method] ?? method;
}
