import { describe, expect, it } from "vitest";
import {
  buildDefaultScheduledLines,
  buildSaleInstallmentMetadata,
  computeNetAvailableCredit,
  extractInstallmentMetadataFromPayments,
  resolveCreditAmountForMode,
  validateInternalCreditPlan,
} from "./internal-credit-plan";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";

describe("internal-credit-plan", () => {
  it("computeNetAvailableCredit subtracts other INTERNAL_CREDIT lines", () => {
    const payments: PosPaymentLine[] = [
      { id: "a", type: "INTERNAL_CREDIT", amount: 20000, reference: "" },
      { id: "b", type: "CASH", amount: 5000, reference: "" },
    ];
    expect(computeNetAvailableCredit(100000, payments)).toBe(80000);
    expect(computeNetAvailableCredit(100000, payments, "a")).toBe(100000);
  });

  it("buildDefaultScheduledLines splits credit evenly", () => {
    const lines = buildDefaultScheduledLines(100000, 3, "2026-07-15");
    expect(lines).toHaveLength(3);
    expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(100000);
    expect(lines[0].dueDate).toBe("2026-07-15");
  });

  it("validateInternalCreditPlan rejects sum mismatch", () => {
    const err = validateInternalCreditPlan(
      {
        mode: "CREDIT_SCHEDULED",
        creditAmount: 100000,
        scheduledLines: [
          { installmentNumber: 1, dueDate: "2026-07-15", amount: 40000 },
          { installmentNumber: 2, dueDate: "2026-08-15", amount: 40000 },
        ],
      },
      200000,
      100000,
    );
    expect(err).toMatch(/deben igualar/);
  });

  it("buildSaleInstallmentMetadata for scheduled plan", () => {
    const meta = buildSaleInstallmentMetadata({
      mode: "CREDIT_SCHEDULED",
      creditAmount: 90000,
      scheduledLines: [
        { installmentNumber: 1, dueDate: "2026-07-15", amount: 45000 },
        { installmentNumber: 2, dueDate: "2026-08-15", amount: 45000 },
      ],
    });
    expect(meta?.numberOfInstallments).toBe(2);
    expect(meta?.firstDueDate).toBe("2026-07-15");
    expect(meta?.customerCreditPlan.creditLineAmount).toBe(90000);
  });

  it("extractInstallmentMetadataFromPayments returns null for lump credit", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "ic",
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
    expect(extractInstallmentMetadataFromPayments(payments)).toBeNull();
  });

  it("resolveCreditAmountForMode for partial", () => {
    expect(
      resolveCreditAmountForMode("PARTIAL_WITH_SCHEDULE", 100000, 80000, 30000),
    ).toBe(70000);
  });
});
