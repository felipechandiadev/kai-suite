"use server";

import { EmployeeSalesCommissionsRequest } from "../infrastructure/sales-commissions.request";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function getEmployeeSalesCommissionsSummaryAction(
  employeeId: string,
  months = 12,
) {
  try {
    const id = String(employeeId || "").trim();
    if (!id) return fail("employeeId requerido");
    return ok(await EmployeeSalesCommissionsRequest.getSummary(id, months));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error comisiones");
  }
}

export async function listEmployeeSalesCommissionSalesAction(input: {
  employeeId: string;
  yearMonth: string;
  page?: number;
  limit?: number;
}) {
  try {
    const employeeId = String(input.employeeId || "").trim();
    const yearMonth = String(input.yearMonth || "").trim();
    if (!employeeId) return fail("employeeId requerido");
    if (!yearMonth) return fail("yearMonth requerido");
    return ok(
      await EmployeeSalesCommissionsRequest.listSales({
        employeeId,
        yearMonth,
        page: input.page,
        limit: input.limit,
      }),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error ventas comisión");
  }
}
