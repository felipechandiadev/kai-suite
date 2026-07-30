import type { PosPaymentLine, PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import { isCustomerLinkedPaymentMethod } from "@/features/pos-cart/pos-payment.types";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";

export type PaymentReferenceLine = {
  type: PosPaymentMethodId;
  companyPaymentMethodId?: string | null;
  creditNoteTransactionId?: string | null;
  backorderTransactionId?: string | null;
};

export function showsPaymentReferenceField(
  line: PaymentReferenceLine,
  cfg: EffectivePaymentMethod | null | undefined,
): boolean {
  if (line.creditNoteTransactionId || line.backorderTransactionId) return false;
  if (isCustomerLinkedPaymentMethod(line.type)) return false;
  if (line.type === "VOUCHER" || line.type === "CHECK") return false;
  return cfg?.requireReference === true;
}

export function validateConfiguredPaymentReference(
  payment: PosPaymentLine,
  cfg: EffectivePaymentMethod | null | undefined,
): string | null {
  if ((Number(payment.amount) || 0) <= 0) return null;
  if (!showsPaymentReferenceField(payment, cfg)) return null;
  if (!payment.reference?.trim()) {
    return "Ingresa la referencia del medio de pago.";
  }
  return null;
}
