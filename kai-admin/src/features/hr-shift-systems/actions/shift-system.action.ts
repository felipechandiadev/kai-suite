"use server";

import { revalidatePath } from "next/cache";
import { HCM_SETTINGS, SETTINGS_HCM } from "@/navigation/hcm-routes";
import { ShiftSystemRequest } from "../infrastructure/shift-system.request";
import type { CreateShiftSystemInput } from "../types/shift-system.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function listShiftSystemsAction(includeInactive = false) {
  try {
    return ok(await ShiftSystemRequest.list(includeInactive));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error sistemas de jornada");
  }
}

export async function createShiftSystemAction(body: CreateShiftSystemInput) {
  try {
    const data = await ShiftSystemRequest.create(body);
    revalidatePath(HCM_SETTINGS, "layout");
    revalidatePath(SETTINGS_HCM, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear sistema");
  }
}

export async function updateShiftSystemAction(
  id: string,
  body: Partial<CreateShiftSystemInput>,
) {
  try {
    const data = await ShiftSystemRequest.update(id, body);
    revalidatePath(HCM_SETTINGS, "layout");
    revalidatePath(SETTINGS_HCM, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar sistema");
  }
}
