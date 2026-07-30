import { validatePlannedPaymentPlanClient } from "@/shared/lib/planned-payment-plan";
import type { InvoicePlannedPaymentLineState } from "@/shared/components/PlannedPaymentLines/InvoicePlannedPaymentLines";
import type { PayrollSettlementPaymentMode } from "../types/payroll-settlement-payment.types";

export function validatePayrollSettlementPaymentClient(args: {
  mode: PayrollSettlementPaymentMode;
  netPayment: number;
  partialAmountStr: string;
  paidLines: InvoicePlannedPaymentLineState[];
  scheduledLines: InvoicePlannedPaymentLineState[];
}): string | null {
  return validatePlannedPaymentPlanClient({
    mode: args.mode,
    total: args.netPayment,
    partialAmount: 0,
    partialAmountStr: args.partialAmountStr,
    paidLines: args.paidLines,
    scheduledLines: args.scheduledLines,
    scheduleAmountError: null,
    hasCashHubOptions: true,
    payeeSelected: true,
    strictZeroTotal: true,
    totalLabel: "líquido a pagar",
  });
}
