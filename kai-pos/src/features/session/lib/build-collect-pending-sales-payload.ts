import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { CreateSaleApiBody } from "./build-create-sale-payload";
import { buildCreateSalePayments } from "./build-create-sale-payload";

export type CollectPendingSalesClientPayload = {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  saleTransactionIds: string[];
  payments: PosPaymentLine[];
};

export type CollectPendingSalesApiBody = Omit<CollectPendingSalesClientPayload, never> & {
  userName: string;
  payments: NonNullable<CreateSaleApiBody["payments"]>;
};

function dominantPaymentMethod(lines: PosPaymentLine[]): string {
  const used = lines.filter((p) => (Number(p.amount) || 0) > 0);
  if (used.length === 0) return "CASH";
  const sorted = [...used].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  return sorted[0].type;
}

export function buildCollectPendingSalesClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  customerId: string;
  saleTransactionIds: string[];
  payments: PosPaymentLine[];
}): CollectPendingSalesClientPayload {
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    customerId: input.customerId.trim(),
    saleTransactionIds: [...new Set(input.saleTransactionIds.map((id) => id.trim()).filter(Boolean))],
    payments: buildCreateSalePayments(input.payments),
  };
}

export function collectPayloadPaymentMethod(payments: PosPaymentLine[]): string {
  return dominantPaymentMethod(payments);
}
