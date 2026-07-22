"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/auth-options";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { OperationalExpenseRequest } from "@/features/treasury-expenses/infrastructure/operational-expense.request";
import type { ExpenseCategoryOption } from "@/features/treasury-expenses/types/operational-expense.types";
import { RecurringExpenseRequest } from "../infrastructure/recurring-expense.request";
import type {
  RecurringExpenseListItem,
  RecurringExpenseRunItem,
  RecurringExpenseUpdatePayload,
} from "../types/recurring-expense.types";

const PATH = "/treasury/operating-expenses/recurring";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidate() {
  revalidatePath(PATH, "page");
  revalidatePath("/treasury/operating-expenses/expenses", "page");
}

export async function listRecurringExpensesForPage(): Promise<{
  rows: RecurringExpenseListItem[];
  categories: ExpenseCategoryOption[];
}> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return { rows: [], categories: [] };
  }
  const [list, categories] = await Promise.all([
    RecurringExpenseRequest.list(company.id),
    OperationalExpenseRequest.listExpenseCategoryOptions(company.id),
  ]);
  return {
    rows: list.success ? list.rows : [],
    categories,
  };
}

export async function listRecurringExpenseRunsAction(
  id: string,
): Promise<{ success: true; rows: RecurringExpenseRunItem[] } | { success: false; error: string }> {
  if (!UUID_RE.test(id)) {
    return { success: false, error: "Id inválido" };
  }
  const r = await RecurringExpenseRequest.listRuns(id);
  if (!r.success) return { success: false, error: r.error || "Error al listar corridas" };
  return { success: true, rows: r.rows };
}

export async function updateRecurringExpenseAction(
  input: RecurringExpenseUpdatePayload,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!UUID_RE.test(input.id)) return { success: false, error: "Id inválido" };
  if (!input.name.trim()) return { success: false, error: "El nombre es obligatorio." };
  const r = await RecurringExpenseRequest.update(input);
  if (r.success) revalidate();
  return r;
}

export async function pauseRecurringExpenseAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!UUID_RE.test(id)) return { success: false, error: "Id inválido" };
  const r = await RecurringExpenseRequest.pause(id);
  if (r.success) revalidate();
  return r;
}

export async function resumeRecurringExpenseAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!UUID_RE.test(id)) return { success: false, error: "Id inválido" };
  const r = await RecurringExpenseRequest.resume(id);
  if (r.success) revalidate();
  return r;
}
