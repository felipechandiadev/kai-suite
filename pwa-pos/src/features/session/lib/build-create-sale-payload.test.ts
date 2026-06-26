import { describe, expect, it } from "vitest";
import { buildCreateSaleClientPayload } from "./build-create-sale-payload";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";

const baseInput = {
  pointOfSaleId: "pos-1",
  cashSessionId: "session-1",
  cartLines: [],
  customer: { customerId: "cust-1", name: "Cliente", document: "", phone: "", email: null },
  appliedPromotions: [],
  appliedTotal: 100000,
  overpay: 0,
};

describe("buildCreateSaleClientPayload installment metadata", () => {
  it("includes installment metadata when INTERNAL_CREDIT has scheduled plan", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "ic-1",
        type: "INTERNAL_CREDIT",
        amount: 100000,
        reference: "",
        companyPaymentMethodId: "pm-ic",
        internalCreditPlan: {
          mode: "CREDIT_SCHEDULED",
          creditAmount: 100000,
          scheduledLines: [
            { installmentNumber: 1, dueDate: "2026-07-15", amount: 50000 },
            { installmentNumber: 2, dueDate: "2026-08-15", amount: 50000 },
          ],
        },
      },
    ];
    const payload = buildCreateSaleClientPayload({ ...baseInput, payments });
    expect(payload.metadata?.numberOfInstallments).toBe(2);
    expect(payload.metadata?.firstDueDate).toBe("2026-07-15");
    expect(payload.metadata?.paymentSchedule).toHaveLength(2);
  });

  it("omits installment metadata for lump-sum internal credit", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "ic-1",
        type: "INTERNAL_CREDIT",
        amount: 50000,
        reference: "",
        internalCreditPlan: {
          mode: "CREDIT_LUMP",
          creditAmount: 50000,
          scheduledLines: [],
        },
      },
    ];
    const payload = buildCreateSaleClientPayload({ ...baseInput, payments });
    expect(payload.metadata?.numberOfInstallments).toBeUndefined();
  });
});
