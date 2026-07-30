import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { CreateSaleApiBody } from "./build-create-sale-payload";
import { buildCreateSalePayments } from "./build-create-sale-payload";

export type PayoutCustomerCreditNotesClientPayload = {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  creditNoteTransactionIds: string[];
  payments: PosPaymentLine[];
};

export type PayoutCustomerCreditNotesApiBody = PayoutCustomerCreditNotesClientPayload & {
  userName: string;
  payments: NonNullable<CreateSaleApiBody["payments"]>;
};

export function buildPayoutCustomerCreditNotesClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  creditNoteTransactionIds: string[];
  payments: PosPaymentLine[];
}): PayoutCustomerCreditNotesClientPayload {
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    customerId: input.customerId.trim(),
    creditNoteTransactionIds: [
      ...new Set(input.creditNoteTransactionIds.map((id) => id.trim()).filter(Boolean)),
    ],
    payments: buildCreateSalePayments(input.payments),
  };
}
