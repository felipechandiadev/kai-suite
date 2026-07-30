import { makePaymentLineId } from "@/features/pos-cart/pos-payment.utils";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";

export const NON_CASH_PAYMENT_LIMIT_MSG =
  "La suma de los medios de pago que no son efectivo no puede superar el total a pagar.";

export type CreditNoteSourceInput = {
  id: string;
  documentNumber: string;
  availableAmount: number;
};

export type ApplyCreditNotePaymentResult =
  | { ok: true; line: PosPaymentLine }
  | { ok: false; error: string };

/**
 * Construye una línea de pago por nota de crédito (sin diálogo intermedio).
 */
export function tryBuildCreditNotePaymentLine(params: {
  nc: CreditNoteSourceInput;
  remaining: number;
  amountToPay: number;
  nonCashTotal: number;
  usedCreditNoteIds: Set<string>;
  saleCustomerId: string;
}): ApplyCreditNotePaymentResult {
  const { nc, remaining, amountToPay, nonCashTotal, usedCreditNoteIds, saleCustomerId } =
    params;

  if (!saleCustomerId.trim()) {
    return { ok: false, error: "Selecciona un cliente antes de aplicar una nota de crédito." };
  }

  const ncId = nc.id.trim();
  if (!ncId) {
    return { ok: false, error: "Nota de crédito inválida." };
  }

  if (usedCreditNoteIds.has(ncId)) {
    return { ok: false, error: "Esa nota de crédito ya está en la lista de pagos." };
  }

  const avail = Math.max(0, Math.round(nc.availableAmount));
  if (avail < 1) {
    return { ok: false, error: "La nota de crédito no tiene saldo disponible." };
  }

  const cap = Math.min(avail, remaining > 0 ? Math.round(remaining) : avail);
  if (cap < 1) {
    return { ok: false, error: "No hay saldo pendiente para aplicar la nota de crédito." };
  }

  if (nonCashTotal + cap > amountToPay + 0.01) {
    return { ok: false, error: NON_CASH_PAYMENT_LIMIT_MSG };
  }

  return {
    ok: true,
    line: {
      id: makePaymentLineId(),
      type: "CUSTOMER_CREDIT_NOTE",
      amount: cap,
      reference: nc.documentNumber.trim(),
      companyPaymentMethodId: null,
      bankAccountKey: null,
      creditNoteTransactionId: ncId,
      backorderTransactionId: null,
    },
  };
}
