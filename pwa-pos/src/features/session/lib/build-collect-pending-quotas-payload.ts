import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { CreateSaleApiBody } from "./build-create-sale-payload";
import { buildCreateSalePayments } from "./build-create-sale-payload";

export type CollectPendingQuotasClientPayload = {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  installmentIds: string[];
  payments: PosPaymentLine[];
};

export type CollectPendingQuotasApiBody = Omit<CollectPendingQuotasClientPayload, never> & {
  userName: string;
  payments: NonNullable<CreateSaleApiBody["payments"]>;
};

export function buildCollectPendingQuotasClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  installmentIds: string[];
  payments: PosPaymentLine[];
}): CollectPendingQuotasClientPayload {
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    customerId: input.customerId.trim(),
    installmentIds: [
      ...new Set(input.installmentIds.map((id) => id.trim()).filter(Boolean)),
    ],
    payments: buildCreateSalePayments(input.payments),
  };
}
