"use server";

import { revalidatePath } from "next/cache";
import { HCM_EMPLOYEES } from "@/navigation/hcm-routes";
import { JobPositionRequest } from "../infrastructure/job-position.request";
import type { CreateJobPositionInput } from "../types/job-position.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function listJobPositionsAction(includeInactive = false) {
  try {
    return ok(await JobPositionRequest.list(includeInactive));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error cargos");
  }
}

export async function createJobPositionAction(body: CreateJobPositionInput) {
  try {
    const data = await JobPositionRequest.create(body);
    revalidatePath(HCM_EMPLOYEES, "page");
    revalidatePath("/settings/hcm", "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear cargo");
  }
}

export async function updateJobPositionAction(
  id: string,
  body: Partial<CreateJobPositionInput>,
) {
  try {
    const data = await JobPositionRequest.update(id, body);
    revalidatePath(HCM_EMPLOYEES, "page");
    revalidatePath("/settings/hcm", "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar cargo");
  }
}
