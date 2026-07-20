"use server";

import { revalidatePath } from "next/cache";
import {
  HCM_EMPLOYEES,
  HCM_REMUNERATIONS,
  HCM_SHIFTS,
  HCM_WORK_SCHEDULES,
  HCM_WORK_SCHEDULES_COMPENSATORY,
  HCM_WORK_SCHEDULES_EXCEPTIONS,
  HCM_WORK_SCHEDULES_SETTINGS,
  HCM_WORK_SCHEDULES_STATEMENTS,
  HCM_WORK_SCHEDULES_TEMPLATES,
  SETTINGS_HCM,
} from "@/navigation/hcm-routes";
import { HrJornadaRequest } from "../infrastructure/hr-jornada.request";
import type { WeekAssignmentInput } from "../types/jornada.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function getJornadaWeekAction(
  weekStart: string,
  laborUnitId?: string | null,
  branchId?: string | null,
) {
  try {
    const data = await HrJornadaRequest.getWeek(weekStart, laborUnitId, branchId);
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al cargar semana");
  }
}

export async function saveJornadaWeekAction(input: {
  weekStart: string;
  assignments: WeekAssignmentInput[];
  overrideReason?: string | null;
  laborUnitId?: string | null;
  branchId?: string | null;
}) {
  try {
    const data = await HrJornadaRequest.saveWeek(input);
    revalidatePath(HCM_WORK_SCHEDULES, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al guardar plan");
  }
}

export async function validateJornadaWeekAction(
  assignments: WeekAssignmentInput[],
) {
  try {
    return ok(await HrJornadaRequest.validateWeek(assignments));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al validar");
  }
}

export async function getJornadaConfigAction() {
  try {
    return ok(await HrJornadaRequest.getConfig());
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error config");
  }
}

export async function updateJornadaConfigAction(
  patch: Record<string, unknown>,
) {
  try {
    const data = await HrJornadaRequest.updateConfig(patch as any);
    revalidatePath(HCM_WORK_SCHEDULES_SETTINGS, "page");
    revalidatePath(SETTINGS_HCM, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al guardar config");
  }
}

export async function listJornadaTemplatesAction() {
  try {
    return ok(await HrJornadaRequest.listTemplates());
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error plantillas");
  }
}

export async function createJornadaTemplateAction(body: {
  name: string;
  type: string;
  isNight?: boolean;
  isNightOutgoing?: boolean;
}) {
  try {
    const data = await HrJornadaRequest.createTemplate(body);
    revalidatePath(HCM_WORK_SCHEDULES_TEMPLATES, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear plantilla");
  }
}

export async function deleteJornadaTemplateAction(id: string) {
  try {
    await HrJornadaRequest.deleteTemplate(id);
    revalidatePath(HCM_WORK_SCHEDULES_TEMPLATES, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al eliminar");
  }
}

export async function listJornadaExceptionsAction(from: string, to: string) {
  try {
    return ok(await HrJornadaRequest.listExceptions(from, to));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error excepciones");
  }
}

export async function createJornadaExceptionAction(body: {
  employeeId: string;
  assignmentId?: string | null;
  workDate: string;
  type: string;
  minutes?: number;
  notes?: string | null;
  affectsPayroll?: boolean;
}) {
  try {
    const data = await HrJornadaRequest.createException(body);
    revalidatePath(HCM_WORK_SCHEDULES, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al registrar excepción");
  }
}

export async function settleJornadaExceptionsAction(
  periodStart: string,
  periodEnd: string,
) {
  try {
    const data = await HrJornadaRequest.settleExceptions(periodStart, periodEnd);
    revalidatePath(HCM_WORK_SCHEDULES_EXCEPTIONS, "page");
    revalidatePath(HCM_REMUNERATIONS, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al liquidar excepciones");
  }
}

export async function listJornadaLedgerAction(employeeId: string) {
  try {
    return ok(await HrJornadaRequest.listLedger(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error ledger");
  }
}

export async function creditJornadaLedgerAction(body: {
  employeeId: string;
  minutes: number;
  workDate?: string;
  reason?: string;
}) {
  try {
    await HrJornadaRequest.creditLedger(body);
    revalidatePath(HCM_WORK_SCHEDULES_COMPENSATORY, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error crédito");
  }
}

export async function redeemJornadaLedgerAction(body: {
  employeeId: string;
  minutes: number;
  reason?: string;
}) {
  try {
    await HrJornadaRequest.redeemLedger(body);
    revalidatePath(HCM_WORK_SCHEDULES_COMPENSATORY, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error redención");
  }
}

export async function expireJornadaLedgerAction(asOfDate: string) {
  try {
    await HrJornadaRequest.expireLedger(asOfDate);
    revalidatePath(HCM_WORK_SCHEDULES_COMPENSATORY, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error caducidad");
  }
}

export async function creditJornadaHolidaysAction(weekStart: string) {
  try {
    await HrJornadaRequest.creditHolidays(weekStart);
    revalidatePath(HCM_WORK_SCHEDULES, "layout");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error crédito festivos");
  }
}

export async function generateAttendanceStatementAction(body: {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
}) {
  try {
    const data = await HrJornadaRequest.generateStatement(body);
    revalidatePath(HCM_WORK_SCHEDULES_STATEMENTS, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al generar comprobante");
  }
}

export async function listAttendanceStatementsAction(employeeId?: string) {
  try {
    return ok(await HrJornadaRequest.listStatements(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error documentos");
  }
}

export async function attachSignedStatementAction(
  id: string,
  signedDocumentUrl: string,
) {
  try {
    await HrJornadaRequest.attachSigned(id, signedDocumentUrl);
    revalidatePath(HCM_WORK_SCHEDULES_STATEMENTS, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al adjuntar escaneo");
  }
}

export async function ingestTimeEntryAction(body: {
  employeeId: string;
  kind: "IN" | "OUT";
  occurredAt: string;
  deviceId?: string;
  idempotencyKey?: string;
}) {
  try {
    await HrJornadaRequest.ingestTimeEntry(body);
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error marcación");
  }
}

export async function listEmployeeShiftsAction(employeeId?: string) {
  try {
    return ok(await HrJornadaRequest.listEmployeeShifts(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error turnos");
  }
}

export async function getActiveEmployeeShiftAction(employeeId: string) {
  try {
    return ok(await HrJornadaRequest.getActiveEmployeeShift(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error turno");
  }
}

export async function createEmployeeShiftAction(body: Record<string, unknown>) {
  try {
    const data = await HrJornadaRequest.createEmployeeShift(body);
    revalidatePath(HCM_EMPLOYEES, "page");
    revalidatePath(HCM_SHIFTS, "page");
    revalidatePath(HCM_WORK_SCHEDULES, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear turno");
  }
}

export async function updateEmployeeShiftAction(
  id: string,
  body: Record<string, unknown>,
) {
  try {
    const data = await HrJornadaRequest.updateEmployeeShift(id, body);
    revalidatePath(HCM_EMPLOYEES, "page");
    revalidatePath(HCM_SHIFTS, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar turno");
  }
}

export async function deleteEmployeeShiftAction(id: string) {
  try {
    await HrJornadaRequest.deleteEmployeeShift(id);
    revalidatePath(HCM_SHIFTS, "page");
    return ok(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al eliminar turno");
  }
}

export async function loadJornadaWeekFromShiftsAction(body: {
  weekStart: string;
  laborUnitId?: string | null;
  branchId?: string | null;
  employeeIds?: string[];
}) {
  try {
    return ok(await HrJornadaRequest.loadWeekFromShifts(body));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al cargar turnos");
  }
}
