"use server";

import { LaborUnitShiftRequest } from "../infrastructure/labor-unit-shift.request";
import type {
  ActiveLaborUnitShiftMembership,
  LaborUnitShiftMemberView,
  LaborUnitShiftView,
} from "../types/labor-unit-shift.types";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export async function listLaborUnitShiftsAction(
  laborUnitId?: string,
): Promise<ActionResult<LaborUnitShiftView[]>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.list(laborUnitId),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al listar turnos",
    };
  }
}

export async function getActiveLaborUnitShiftForEmployeeAction(
  employeeId: string,
): Promise<ActionResult<ActiveLaborUnitShiftMembership>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.getActiveForEmployee(employeeId),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al obtener turno",
    };
  }
}

export async function createLaborUnitShiftAction(
  body: Record<string, unknown>,
): Promise<ActionResult<LaborUnitShiftView>> {
  try {
    return { success: true, data: await LaborUnitShiftRequest.create(body) };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al crear turno",
    };
  }
}

export async function updateLaborUnitShiftAction(
  id: string,
  body: Record<string, unknown>,
): Promise<ActionResult<LaborUnitShiftView>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.update(id, body),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al actualizar turno",
    };
  }
}

export async function listLaborUnitShiftMembersAction(
  shiftId: string,
): Promise<ActionResult<LaborUnitShiftMemberView[]>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.listMembers(shiftId),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al listar miembros",
    };
  }
}

export async function addLaborUnitShiftMemberAction(
  shiftId: string,
  employeeId: string,
): Promise<ActionResult<LaborUnitShiftMemberView>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.addMember(shiftId, employeeId),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al asignar miembro",
    };
  }
}

export async function removeLaborUnitShiftMemberAction(
  shiftId: string,
  employeeId: string,
): Promise<ActionResult<LaborUnitShiftMemberView>> {
  try {
    return {
      success: true,
      data: await LaborUnitShiftRequest.removeMember(shiftId, employeeId),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al quitar miembro",
    };
  }
}
