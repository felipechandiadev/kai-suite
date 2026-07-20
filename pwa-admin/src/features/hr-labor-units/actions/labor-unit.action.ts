"use server";

import { revalidatePath } from "next/cache";
import { HCM_SETTINGS } from "@/navigation/hcm-routes";
import { LaborUnitRequest } from "../infrastructure/labor-unit.request";
import type { CreateLaborUnitInput } from "../types/labor-unit.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function listLaborUnitsAction(opts?: {
  includeInactive?: boolean;
  branchId?: string | null;
}) {
  try {
    return ok(await LaborUnitRequest.list(opts));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error unidades laborales");
  }
}

export async function createLaborUnitAction(body: CreateLaborUnitInput) {
  try {
    const data = await LaborUnitRequest.create(body);
    revalidatePath(HCM_SETTINGS, "layout");
    return ok(data);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Error al crear unidad laboral",
    );
  }
}

export async function updateLaborUnitAction(
  id: string,
  body: Partial<CreateLaborUnitInput>,
) {
  try {
    const data = await LaborUnitRequest.update(id, body);
    revalidatePath(HCM_SETTINGS, "layout");
    return ok(data);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Error al actualizar unidad laboral",
    );
  }
}
