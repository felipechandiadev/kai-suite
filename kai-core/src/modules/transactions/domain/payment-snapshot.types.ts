/**
 * Snapshot inmutable de un medio de pago aplicado a una transacción.
 * Fuente de verdad para pagos múltiples: `metadata.payments[]`.
 */
export type PaymentSnapshot = {
  companyPaymentMethodId: string | null;
  method: string;
  alias: string | null;
  bankAccountKey: string | null;
  amount: number;
  reference: string | null;
  capturedAt: string;
  checkData?: Record<string, unknown> | null;
  voucherData?: Record<string, unknown> | null;
};
