export type PosInternalCreditMode =
  | "CREDIT_LUMP"
  | "CREDIT_SCHEDULED"
  | "PARTIAL_WITH_SCHEDULE";

export type PosInternalCreditScheduledLine = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
};

export type PosInternalCreditPlan = {
  mode: PosInternalCreditMode;
  creditAmount: number;
  scheduledLines: PosInternalCreditScheduledLine[];
  /** Solo PARTIAL_WITH_SCHEDULE: abono hoy con medios normales (fuera de INTERNAL_CREDIT). */
  immediateAmount?: number;
};

export type SaleInstallmentMetadata = {
  numberOfInstallments: number;
  firstDueDate: string;
  paymentSchedule: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
  }>;
  customerCreditPlan: {
    mode: PosInternalCreditMode;
    creditLineAmount: number;
    immediateAmount?: number;
  };
};
