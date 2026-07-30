import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import {
  buildCreateSaleLines,
  buildCreateSalePayments,
  type CreateSaleApiBody,
} from "./build-create-sale-payload";

export type ConfirmCustomerReturnDocumentApiBody = CreateSaleApiBody & {
  originalSaleId: string;
};

export type ConfirmCustomerReturnDocumentClientPayload = Omit<
  ConfirmCustomerReturnDocumentApiBody,
  "userName"
>;

export type ConfirmCustomerReturnRefundApiBody = ConfirmCustomerReturnDocumentApiBody;
export type ConfirmCustomerReturnRefundClientPayload = ConfirmCustomerReturnDocumentClientPayload;

function buildPromotionSnapshot(
  applied: AppliedSnapshot[],
): CreateSaleApiBody["promotionSnapshot"] {
  if (!applied.length) return undefined;
  return applied.map((ap) => ({
    promotionId: ap.promotionId,
    promotionCode: ap.promotionCode,
    promotionName: ap.promotionName,
    type: String(ap.type),
    activation: String(ap.activation),
    authorization: String(ap.authorization),
    amountDiscounted: Math.round(Number(ap.amountDiscounted) || 0),
    affectedLineIds: [...ap.affectedLineIds],
    isOrderLevel: ap.isOrderLevel === true,
    accountingTag: ap.accountingTag ?? undefined,
  }));
}

/** Payload para devolución con nota de crédito (sin pagos en caja). */
export function buildConfirmCustomerReturnDocumentPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  originalSaleId: string;
  cartLines: PosCartLine[];
  customer: PosSaleCustomer | null;
  appliedPromotions: AppliedSnapshot[];
}): ConfirmCustomerReturnDocumentClientPayload {
  if (!input.customer?.customerId?.trim()) {
    throw new Error("Cliente requerido para registrar la devolución");
  }
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    originalSaleId: input.originalSaleId.trim(),
    paymentMethod: "CASH",
    lines: buildCreateSaleLines(input.cartLines),
    amountPaid: 0,
    changeAmount: 0,
    customerId: input.customer.customerId.trim(),
    promotionSnapshot: buildPromotionSnapshot(input.appliedPromotions),
  };
}

function dominantPaymentMethod(lines: PosPaymentLine[]): string {
  const used = lines.filter((p) => (Number(p.amount) || 0) > 0);
  if (used.length === 0) return "CASH";
  const sorted = [...used].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  return sorted[0].type;
}

/** Devolución con reembolso inmediato en caja (medios de pago + NC). */
export function buildConfirmCustomerReturnRefundPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  originalSaleId: string;
  cartLines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  appliedPromotions: AppliedSnapshot[];
  appliedTotal: number;
  overpay: number;
}): ConfirmCustomerReturnRefundClientPayload {
  if (!input.customer?.customerId?.trim()) {
    throw new Error("Cliente requerido para registrar la devolución");
  }
  const paymentLines = input.payments.filter((p) => (Number(p.amount) || 0) > 0);
  if (paymentLines.length === 0) {
    throw new Error("Agrega al menos un medio de pago para el reembolso");
  }
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    originalSaleId: input.originalSaleId.trim(),
    paymentMethod: dominantPaymentMethod(paymentLines),
    lines: buildCreateSaleLines(input.cartLines),
    payments: buildCreateSalePayments(input.payments),
    amountPaid: Math.round(input.appliedTotal),
    changeAmount: Math.round(Math.max(0, input.overpay)),
    customerId: input.customer.customerId.trim(),
    promotionSnapshot: buildPromotionSnapshot(input.appliedPromotions),
  };
}
