"use server";

import { revalidatePath } from "next/cache";
import {
  HCM_SETTINGS,
  HCM_SETTINGS_ORG_UNITS,
} from "@/navigation/hcm-routes";
import { OrganizationalUnitRequest } from "../infrastructure/organizational-unit.request";
import type {
  CreateOrganizationalUnitInput,
  OrganizationalUnitListItem,
  UpdateOrganizationalUnitInput,
} from "../types/organizational-unit.types";

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

function revalidateOrgUnits() {
  revalidatePath(HCM_SETTINGS_ORG_UNITS, "page");
  revalidatePath(HCM_SETTINGS, "layout");
}

export async function listOrganizationalUnitsAction(opts: {
  includeInactive?: boolean;
  unitType?: string;
  branchId?: string;
  companyId?: string;
  resultCenterId?: string;
} = {}): Promise<OrganizationalUnitListItem[]> {
  return OrganizationalUnitRequest.list(opts);
}

export async function createOrganizationalUnitAction(
  body: CreateOrganizationalUnitInput,
) {
  try {
    const data = await OrganizationalUnitRequest.create(body);
    revalidateOrgUnits();
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear unidad");
  }
}

export async function updateOrganizationalUnitAction(
  id: string,
  body: UpdateOrganizationalUnitInput,
) {
  try {
    const data = await OrganizationalUnitRequest.update(id, body);
    revalidateOrgUnits();
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar unidad");
  }
}

export async function deactivateOrganizationalUnitAction(id: string) {
  try {
    const data = await OrganizationalUnitRequest.update(id, { isActive: false });
    revalidateOrgUnits();
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al inactivar unidad");
  }
}
