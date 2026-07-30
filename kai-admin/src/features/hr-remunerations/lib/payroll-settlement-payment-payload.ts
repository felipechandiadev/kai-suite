import type { PlannedPaymentPayload } from "@/shared/lib/planned-payment-plan";
import type {
  PayrollSettlementPaymentLinePayload,
  PayrollSettlementPaymentPayload,
} from "../types/payroll-settlement-payment.types";

export function buildPayrollSettlementPaymentPayload(
  payload: PlannedPaymentPayload,
): PayrollSettlementPaymentPayload {
  return {
    mode: payload.mode,
    partialPaidAmount: payload.partialPaidAmount,
    paidLines: payload.paidLines.map(mapPaidLine),
    scheduledLines: payload.scheduledLines.map(mapScheduledLine),
  };
}

function mapPaidLine(line: PlannedPaymentPayload["paidLines"][number]): PayrollSettlementPaymentLinePayload {
  return {
    dueDate: line.dueDate,
    amount: line.amount,
    paymentMethod: line.paymentMethod,
    companyBankAccountKey: line.companyBankAccountKey,
    employeeBankAccountKey: line.supplierBankAccountKey,
    chequeNumber: line.chequeNumber,
    cashHubId: line.cashHubId,
  };
}

function mapScheduledLine(
  line: PlannedPaymentPayload["scheduledLines"][number],
): PayrollSettlementPaymentLinePayload {
  return {
    dueDate: line.dueDate,
    amount: line.amount,
  };
}
