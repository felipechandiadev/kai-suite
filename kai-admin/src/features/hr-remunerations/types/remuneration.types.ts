export type RemunerationLine = {
  typeId: string;
  amount: number;
  category?: "EARNING" | "DEDUCTION" | string;
  label?: string;
};

export type RemunerationEmployerCost = {
  code?: string;
  label?: string;
  amount?: number;
  ratePercent?: number;
};

export type RemunerationGridRow = {
  id: string;
  documentNumber?: string | null;
  date: string;
  employeeId: string | null;
  employeeName: string;
  employeeDocumentNumber?: string | null;
  resultCenterId: string | null;
  totalEarnings: number;
  totalDeductions: number;
  totalImponible?: number;
  totalNoImponible?: number;
  totalEmployerCost?: number;
  netPayment: number;
  employerCosts?: RemunerationEmployerCost[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
  lines?: RemunerationLine[];
};

export type RemunerationListResult = {
  success: boolean;
  data: RemunerationGridRow[];
};

export { labelPayrollLineType as labelPayrollLineTypeId } from "../lib/payroll-line-types";
