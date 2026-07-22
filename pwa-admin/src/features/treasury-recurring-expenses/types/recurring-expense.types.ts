import type { OperationalExpenseDocumentKind } from "@/features/treasury-expenses/types/operational-expense.types";

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
  documentKind: OperationalExpenseDocumentKind;
  taxId: string | null;
  /** Legacy scheduled templates may still have amounts; new plantillas are null/0. */
  amountNet: number | null;
  taxAmount: number | null;
  total: number | null;
  frequency: RecurringExpenseFrequency | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  isActive: boolean;
  sourceOperationalExpenseId: string | null;
};

export type RecurringExpenseRunItem = {
  id: string;
  periodKey: string;
  operationalExpenseId: string | null;
  status: RecurringExpenseRunStatus;
  errorMessage: string | null;
  ranAt: string;
};

export type RecurringExpenseUpdatePayload = {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string;
  supplierId?: string;
  documentKind?: OperationalExpenseDocumentKind;
  isActive: boolean;
};

/** @deprecated Direct create from UI is removed; templates come from OE. */
export type RecurringExpenseCreatePayload = {
  name: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  amountNet?: number;
  taxAmount?: number;
  total?: number;
  frequency?: RecurringExpenseFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive?: boolean;
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
