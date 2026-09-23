"use server";

import { revalidatePath } from "next/cache";
import { HCM_SETTINGS, HCM_SETTINGS_ORG_UNITS } from "@/navigation/hcm-routes";
import { LaborUnitRequest } from "../infrastructure/labor-unit.request";
import type {
  CreateLaborUnitInput,
  LaborUnitAssociationsInput,
} from "../types/labor-unit.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

function revalidateLaborUnitSurfaces() {
  revalidatePath(HCM_SETTINGS, "layout");
  revalidatePath(HCM_SETTINGS_ORG_UNITS, "page");
  revalidatePath("/settings/branches", "page");
  revalidatePath("/inventory/storages", "page");
  revalidatePath("/production/units", "page");
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
    revalidateLaborUnitSurfaces();
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
    revalidateLaborUnitSurfaces();
    return ok(data);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Error al actualizar unidad laboral",
    );
  }
}

export async function setLaborUnitAssociationsAction(
  id: string,
  body: LaborUnitAssociationsInput,
) {
  try {
    const data = await LaborUnitRequest.setAssociations(id, body);
    revalidateLaborUnitSurfaces();
    return ok(data);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Error al guardar asociaciones",
    );
  }
}
