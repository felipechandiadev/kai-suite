"use server";

import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth/auth-options";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { OperationalExpenseRequest } from "../infrastructure/operational-expense.request";
import type {
  ExpenseCategoryOption,
  OperationalExpenseCreatePayload,
  OperationalExpenseGridRow,
  OperationalExpenseStatus,
  SupplierOption,
} from "../types/operational-expense.types";

const PATH = "/treasury/operating-expenses/expenses";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listOperationalExpensesForGrid(params?: {
  search?: string;
  status?: OperationalExpenseStatus | "";
}): Promise<{
  rows: OperationalExpenseGridRow[];
  total: number;
  categories: ExpenseCategoryOption[];
  suppliers: SupplierOption[];
}> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return { rows: [], total: 0, categories: [], suppliers: [] };
  }

  const [expenses, categories, suppliers] = await Promise.all([
    OperationalExpenseRequest.list(company.id, 500, 0, params?.status || undefined),
    OperationalExpenseRequest.listExpenseCategoryOptions(company.id),
    OperationalExpenseRequest.listSupplierOptions(),
  ]);

  const q = (params?.search ?? "").trim().toLowerCase();
  if (!q) {
    return { rows: expenses.rows, total: expenses.total, categories, suppliers };
  }

  const rows = expenses.rows.filter((r) => {
    const blob = [
      r.name,
      r.referenceNumber,
      r.categoryName,
      r.supplierName,
      r.description ?? "",
      r.status,
      r.paymentStatus ?? "",
      r.operationDate,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });

  return { rows, total: rows.length, categories, suppliers };
}

export async function createOperationalExpenseAction(
  input: OperationalExpenseCreatePayload,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const company = await CompanyRequest.getCurrent();
  if (!company?.id) {
    return { success: false, error: "No hay empresa activa configurada." };
  }

  const session = await getServerSession(authOptions);
  const userId = (
    session?.user?.accessToken || session?.user?.id || ""
  ).trim();
  if (!UUID_RE.test(userId)) {
    return {
      success: false,
      error: "No se pudo determinar el usuario creador (UUID) desde la sesión.",
    };
  }

  if (!input.name.trim()) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  if (!UUID_RE.test(input.categoryId)) {
    return { success: false, error: "Debe seleccionar una categoría válida." };
  }
  if (!UUID_RE.test(input.supplierId)) {
    return { success: false, error: "Debe seleccionar un proveedor válido." };
  }
  if (!input.referenceNumber.trim()) {
    return { success: false, error: "La referencia (folio) es obligatoria." };
  }
  if (!input.operationDate.trim()) {
    return { success: false, error: "La fecha de operación es obligatoria." };
  }

  const amounts = input.fiscalAmounts;
  if (!amounts || amounts.total < 0.01) {
    return { success: false, error: "El total debe ser mayor a cero." };
  }

  const payment = input.supplierDocumentPayment;
  const paidSum = (payment.paidLines ?? []).reduce(
    (s, l) => s + (Number((l as { amount?: number }).amount) || 0),
    0,
  );
  const schedSum = (payment.scheduledLines ?? []).reduce(
    (s, l) => s + (Number((l as { amount?: number }).amount) || 0),
    0,
  );
  if (payment.mode === "COMPLETED" && Math.abs(paidSum - amounts.total) > 1) {
    return { success: false, error: "El pago debe igualar el total del documento." };
  }
  if (payment.mode === "PENDING_SCHEDULED" && Math.abs(schedSum - amounts.total) > 1) {
    return { success: false, error: "Las cuotas deben sumar el total del documento." };
  }

  const result = await OperationalExpenseRequest.create({
    companyId: company.id,
    name: input.name,
    categoryId: input.categoryId,
    supplierId: input.supplierId,
    referenceNumber: input.referenceNumber.trim(),
    operationDate: input.operationDate,
    description: input.description?.trim() || undefined,
    createdBy: userId,
    status: "APPROVED",
    documentKind: input.documentKind,
    fiscalAmounts: {
      subtotal: amounts.subtotal,
      taxAmount: amounts.taxAmount,
      total: amounts.total,
      taxId: amounts.taxId ?? undefined,
    },
    supplierDocumentPayment: input.supplierDocumentPayment,
  });

  if (result.success) {
    revalidatePath(PATH, "page");
  }
  return result;
}
