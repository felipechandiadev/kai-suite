/**
 * Tipos compartidos con el backend para configurar medios de pago a nivel
 * empresa (`companies.settings.paymentMethods`).
 */
/**
 * Tipos de medio de pago configurables a nivel empresa. NO incluye `MIXED`:
 * un pago "mixto" se deduce del sistema cuando una transacción tiene más
 * de un detalle de pago, no es una opción del catálogo.
 */
export type CompanyPaymentMethodId =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "TRANSFER"
  | "CHECK"
  | "CREDIT"
  | "INTERNAL_CREDIT"
  | "CUSTOMER_CREDIT_NOTE"
  | "ORDER_ADVANCE"
  | "VOUCHER";

export interface CompanyPaymentMethodConfig {
  id: string;
  method: CompanyPaymentMethodId;
  alias?: string | null;
  displayOrder: number;
  isActive: boolean;
  requireReference: boolean;
  bankAccountKey?: string | null;
  metadata?: Record<string, any> | null;
  /** Obligatorio cuando method === VOUCHER. */
  voucherKindId?: string | null;
}

export const COMPANY_PAYMENT_METHOD_LABELS: Record<
  CompanyPaymentMethodId,
  string
> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT: "Crédito",
  INTERNAL_CREDIT: "Crédito interno",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito cliente",
  ORDER_ADVANCE: "Abono por encargo",
  VOUCHER: "Voucher",
};

export function companyPaymentMethodLabel(
  method: string | CompanyPaymentMethodId,
): string {
  const key = method as CompanyPaymentMethodId;
  return COMPANY_PAYMENT_METHOD_LABELS[key] ?? String(method);
}

/** Referencia obligatoria; no editable en empresa ni POS. */
export const PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE: CompanyPaymentMethodId[] = [
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
  "VOUCHER",
];

export function companyPaymentMethodAlwaysRequiresReference(
  method: CompanyPaymentMethodId,
): boolean {
  return PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE.includes(method);
}

/** Medios implícitos del sistema (NC, abono encargo): no se configuran por POS. */
export const POS_IMPLICIT_PAYMENT_METHOD_IDS: CompanyPaymentMethodId[] = [
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
];

/** Medios configurables por POS en Admin (caja física). */
export const POS_CONFIGURABLE_METHOD_IDS: CompanyPaymentMethodId[] = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
  "VOUCHER",
];

/** @deprecated Use POS_CONFIGURABLE_METHOD_IDS */
export const POS_VALID_METHOD_IDS = POS_CONFIGURABLE_METHOD_IDS;
