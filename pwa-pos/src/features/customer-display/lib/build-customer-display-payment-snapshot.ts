import type { CustomerDisplaySnapshot } from "@flowstore/customer-display-client";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";
import { buildCustomerDisplaySnapshot } from "./build-customer-display-snapshot";

export type CustomerDisplayPaymentLineInput = {
  label: string;
  amount: number;
};

export type BuildCustomerDisplayPaymentSnapshotInput = {
  lines: PosCartLine[];
  orderDiscount: number;
  ctx: Pick<PosContextV1, "pointOfSaleId" | "pointOfSaleName" | "branchName"> | null;
  amountDueLabel: string;
  amountToPay: number;
  appliedTotal: number;
  remaining: number;
  overpay: number;
  paymentStatusLabel: string;
  customerName?: string | null;
  paymentLines: CustomerDisplayPaymentLineInput[];
};

export function buildCustomerDisplayPaymentSnapshot(
  input: BuildCustomerDisplayPaymentSnapshotInput,
): CustomerDisplaySnapshot | null {
  const base = buildCustomerDisplaySnapshot({
    lines: input.lines,
    orderDiscount: input.orderDiscount,
    ctx: input.ctx,
    stateOverride: "payment",
  });
  if (!base) return null;

  const customerName = input.customerName?.trim();
  const payments = input.paymentLines
    .filter((p) => p.amount > 0)
    .map((p) => ({ label: p.label, amount: Math.round(p.amount) }));

  return {
    ...base,
    customer: customerName ? { name: customerName } : null,
    payments,
    payment: {
      amountDueLabel: input.amountDueLabel,
      amountToPay: input.amountToPay,
      appliedTotal: input.appliedTotal,
      remaining: input.remaining,
      overpay: input.overpay,
      statusLabel: input.paymentStatusLabel,
    },
  };
}
