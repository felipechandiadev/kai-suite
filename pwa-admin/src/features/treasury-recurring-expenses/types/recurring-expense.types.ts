export type RecurringExpenseFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurringExpenseRunStatus = "SUCCESS" | "FAILED";

export type RecurringExpenseListItem = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  amountNet: number;
  taxAmount: number;
  total: number;
  frequency: RecurringExpenseFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
};

export type RecurringExpenseRunItem = {
  id: string;
  periodKey: string;
  operationalExpenseId: string | null;
  status: RecurringExpenseRunStatus;
  errorMessage: string | null;
  ranAt: string;
};

export type RecurringExpenseCreatePayload = {
  name: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  amountNet: number;
  taxAmount: number;
  total: number;
  frequency: RecurringExpenseFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive?: boolean;
};

export type RecurringExpenseUpdatePayload = {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  amountNet: number;
  taxAmount: number;
  total: number;
  frequency: RecurringExpenseFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  isActive: boolean;
};

export const RECURRING_FREQUENCY_LABELS: Record<RecurringExpenseFrequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  YEARLY: "Anual",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
