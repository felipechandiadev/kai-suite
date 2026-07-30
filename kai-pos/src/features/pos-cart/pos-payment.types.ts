export const POS_PAYMENT_METHOD_IDS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
  "VOUCHER",
  "INTERNAL_CREDIT",
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
] as const;

export type PosPaymentMethodId = (typeof POS_PAYMENT_METHOD_IDS)[number];

export const CUSTOMER_LINKED_PAYMENT_METHODS = [
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
] as const;

export type CustomerLinkedPaymentMethod = (typeof CUSTOMER_LINKED_PAYMENT_METHODS)[number];

export function isCustomerLinkedPaymentMethod(
  method: string,
): method is CustomerLinkedPaymentMethod {
  return (CUSTOMER_LINKED_PAYMENT_METHODS as readonly string[]).includes(method);
}

/** Medios permitidos al devolver saldo de NC al cliente en caja. */
export const NC_PAYOUT_ALLOWED_PAYMENT_METHODS = ["CASH", "TRANSFER", "CHECK"] as const;

export type NcPayoutAllowedPaymentMethod =
  (typeof NC_PAYOUT_ALLOWED_PAYMENT_METHODS)[number];

export function isNcPayoutAllowedPaymentMethod(method: string): boolean {
  return (NC_PAYOUT_ALLOWED_PAYMENT_METHODS as readonly string[]).includes(
    method.trim().toUpperCase(),
  );
}

/** Mismos medios que devolución de saldo NC: sin tarjetas en reembolso inmediato de devolución. */
export function isImmediateReturnRefundAllowedPaymentMethod(method: string): boolean {
  return isNcPayoutAllowedPaymentMethod(method);
}

/**
 * Datos específicos de un cheque entrante (cliente -> empresa). Se
 * adjuntan al `PosPaymentLine` cuando `type === "CHECK"`. El backend
 * los recibe en `payments[].checkData` y los persiste en
 * `metadata.paymentSnapshots[].checkData` para materializar un registro
 * `Check` independiente con su propio ciclo de vida.
 */
import type { PosInternalCreditPlan } from "@/features/pos-payment/lib/internal-credit-plan.types";

export type { PosInternalCreditPlan } from "@/features/pos-payment/lib/internal-credit-plan.types";

export type PosCheckPaymentData = {
  checkNumber: string;
  bankName: string;
  drawerName?: string;
  drawerDocument?: string;
  /** Fecha de emisión (ISO YYYY-MM-DD). Vacío = hoy en el backend. */
  issueDate?: string;
  /** "A fecha" para cheques postdatados. */
  dueDate?: string;
};

/** Datos de un voucher entrante cuando `type === "VOUCHER"`. */
export type PosVoucherPaymentData = {
  kindId?: string;
  kindCode: string;
  kindName?: string;
  issuerName?: string;
  faceValue?: number | null;
  expiresAt?: string;
};

/**
 * Línea de pago en POS.
 *
 * `type` se mantiene como enum semántico (compatibilidad con backend +
 * asientos contables). `companyPaymentMethodId` referencia la entrada
 * concreta del catálogo de la empresa para hidratar alias / banco /
 * snapshot al confirmar la venta.
 */
export type PosPaymentLine = {
  id: string;
  type: PosPaymentMethodId;
  amount: number;
  reference: string;
  /** Id estable del medio configurado a nivel empresa. Opcional por compat;
   * cuando viene definido, el backend persistirá un snapshot trazable. */
  companyPaymentMethodId?: string | null;
  /** Solo TRANSFER: cuenta bancaria destino (de la empresa). */
  bankAccountKey?: string | null;
  /** Datos del cheque cuando `type === "CHECK"`. */
  checkData?: PosCheckPaymentData;
  /** Datos del voucher cuando `type === "VOUCHER"`. */
  voucherData?: PosVoucherPaymentData;
  /** Nota de crédito aplicada (`CUSTOMER_CREDIT_NOTE`). */
  creditNoteTransactionId?: string | null;
  /** Encargo cuyo abono se aplica (`ORDER_ADVANCE`). */
  backorderTransactionId?: string | null;
  /** Plan de crédito interno (cuotas / abono parcial). */
  internalCreditPlan?: PosInternalCreditPlan;
  /** Intent Mercado Pago Point aprobado. */
  paymentGatewayIntentId?: string | null;
};
