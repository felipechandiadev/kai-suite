import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { CreateSaleClientPayload } from "@/features/session/lib/build-create-sale-payload";
import {
  buildCreateSaleClientPayload,
  type CreateSaleApiBody,
} from "@/features/session/lib/build-create-sale-payload";

export type CreateBackorderApiBody = CreateSaleApiBody & {
  backorderDepositAmount: number;
  backorderDepositPercent?: number;
};

export type CreateBackorderClientPayload = Omit<CreateBackorderApiBody, "userName">;

export function buildCreateBackorderClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  cartLines: Parameters<typeof buildCreateSaleClientPayload>[0]["cartLines"];
  payments: Parameters<typeof buildCreateSaleClientPayload>[0]["payments"];
  customer: PosSaleCustomer | null;
  appliedPromotions: Parameters<typeof buildCreateSaleClientPayload>[0]["appliedPromotions"];
  appliedTotal: number;
  overpay: number;
  backorderDepositAmount: number;
  backorderDepositPercent: number;
}): CreateBackorderClientPayload {
  const base = buildCreateSaleClientPayload({
    pointOfSaleId: input.pointOfSaleId,
    cashSessionId: input.cashSessionId,
    cartLines: input.cartLines,
    payments: input.payments,
    customer: input.customer,
    appliedPromotions: input.appliedPromotions,
    appliedTotal: input.appliedTotal,
    overpay: input.overpay,
  });

  const customer = input.customer;
  const metadata: Record<string, unknown> = {
    backorderCustomerSnapshot: customer
      ? {
          name: customer.name?.trim() || null,
          document: customer.document?.trim() || null,
          phone: customer.phone?.trim() || null,
        }
      : undefined,
  };

  return {
    ...base,
    metadata,
    backorderDepositAmount: Math.round(input.backorderDepositAmount),
    backorderDepositPercent: Math.round(input.backorderDepositPercent),
  };
}
