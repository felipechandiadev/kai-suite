"use server";

import { revalidatePath } from "next/cache";
import { HCM_EMPLOYEES } from "@/navigation/hcm-routes";
import { EmployeeTimelineRequest } from "../infrastructure/employee-timeline.request";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function listEmployeeTimelineAction(employeeId: string) {
  try {
    return ok(await EmployeeTimelineRequest.list(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error historial");
  }
}

export async function addEmployeeTimelineNoteAction(
  employeeId: string,
  body: string,
) {
  try {
    const data = await EmployeeTimelineRequest.addNote(employeeId, body);
    revalidatePath(HCM_EMPLOYEES, "page");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al anotar");
  }
}
