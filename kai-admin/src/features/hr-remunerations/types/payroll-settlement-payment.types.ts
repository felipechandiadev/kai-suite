import type { PlannedPaymentMode } from "@/shared/components/PlannedPaymentLines/planned-payment-mode.types";

export type PayrollSettlementPaymentMode = PlannedPaymentMode;

export type PayrollSettlementPaymentLinePayload = {
  dueDate: string;
  amount: number;
  paymentMethod?: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  employeeBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  cashHubId?: string | null;
};

export type PayrollSettlementPaymentPayload = {
  mode: PayrollSettlementPaymentMode;
  partialPaidAmount?: number;
  paidLines: PayrollSettlementPaymentLinePayload[];
  scheduledLines: PayrollSettlementPaymentLinePayload[];
};

export { PLANNED_PAYMENT_MODE_OPTIONS as PAYROLL_SETTLEMENT_PAYMENT_MODE_OPTIONS } from "@/shared/components/PlannedPaymentLines/planned-payment-mode.types";
