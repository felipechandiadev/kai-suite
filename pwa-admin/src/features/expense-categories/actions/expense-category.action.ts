"use server";

import { revalidatePath } from "next/cache";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { ExpenseCategoryRequest } from "../infrastructure/expense-category.request";
import type {
  CreateExpenseCategoryResult,
  DeleteExpenseCategoryResult,
  ExpenseCategoryListItem,
  ExpenseCategoryOperationalGroupValue,
  OperationalGroupMetaItem,
  UpdateExpenseCategoryResult,
} from "../types/expense-category.types";

const PATH = "/treasury/operating-expenses/categories";

function revalidateExpenseCategoriesRoute() {
  revalidatePath(PATH, "page");
}

export async function listExpenseCategoryOperationalGroupsMeta(): Promise<OperationalGroupMetaItem[]> {
  const r = await ExpenseCategoryRequest.getOperationalGroupsMeta();
  return r.success ? r.rows : [];
}

export async function listExpenseCategoriesForPage(): Promise<ExpenseCategoryListItem[]> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return [];
  }
  const r = await ExpenseCategoryRequest.list(company.id);
  return r.success ? r.rows : [];
}

export async function createExpenseCategoryAction(input: {
  code?: string;
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
  description?: string;
  requiresApproval: boolean;
  approvalThreshold: number;
  isActive: boolean;
}): Promise<CreateExpenseCategoryResult> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return {
      success: false,
      error: "Configura la empresa en Ajustes para crear categorías de gasto.",
    };
  }
  const r = await ExpenseCategoryRequest.create({
    companyId: company.id,
    ...(input.code?.trim() ? { code: input.code.trim() } : {}),
    name: input.name,
    operationalExpenseGroup: input.operationalExpenseGroup,
    description: input.description?.trim() || undefined,
    requiresApproval: input.requiresApproval,
    approvalThreshold: input.requiresApproval ? input.approvalThreshold : 0,
    isActive: input.isActive,
  });
  if (r.success) {
    revalidateExpenseCategoriesRoute();
  }
  return r;
}

export async function updateExpenseCategoryAction(input: {
  id: string;
  code?: string;
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
  description: string;
  requiresApproval: boolean;
  approvalThreshold: number;
  defaultResultCenterId: string | null;
  isActive: boolean;
}): Promise<UpdateExpenseCategoryResult> {
  const r = await ExpenseCategoryRequest.update(input.id, {
    ...(input.code?.trim() ? { code: input.code.trim() } : {}),
    name: input.name,
    operationalExpenseGroup: input.operationalExpenseGroup,
    description: input.description.trim() || null,
    requiresApproval: input.requiresApproval,
    approvalThreshold: input.requiresApproval ? input.approvalThreshold : 0,
    defaultResultCenterId: input.defaultResultCenterId,
    isActive: input.isActive,
  });
  if (r.success) {
    revalidateExpenseCategoriesRoute();
  }
  return r;
}

export async function updateExpenseCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<UpdateExpenseCategoryResult> {
  const r = await ExpenseCategoryRequest.updatePartial(id, { isActive });
  if (r.success) {
    revalidateExpenseCategoriesRoute();
  }
  return r;
}

export async function deleteExpenseCategoryAction(id: string): Promise<DeleteExpenseCategoryResult> {
  const r = await ExpenseCategoryRequest.remove(id);
  if (r.success) {
    revalidateExpenseCategoriesRoute();
  }
  return r;
}
