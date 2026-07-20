"use server";

import { revalidatePath } from "next/cache";
import { EmploymentContractRequest } from "../infrastructure/employment-contract.request";

import { HCM_EMPLOYEES } from "@/navigation/hcm-routes";

const EMPLOYEES_PATH = HCM_EMPLOYEES;

function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(message: string) {
  return { success: false as const, message };
}

export async function getActiveContractAction(employeeId: string) {
  try {
    return ok(await EmploymentContractRequest.getActive(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error contrato");
  }
}

export async function listContractsAction(employeeId: string) {
  try {
    return ok(await EmploymentContractRequest.list(employeeId));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error contratos");
  }
}

export async function createContractAction(
  employeeId: string,
  body: Record<string, unknown>,
) {
  try {
    const data = await EmploymentContractRequest.create(employeeId, body);
    revalidatePath(EMPLOYEES_PATH, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al crear contrato");
  }
}

export async function updateContractAction(
  contractId: string,
  body: Record<string, unknown>,
) {
  try {
    const data = await EmploymentContractRequest.update(contractId, body);
    revalidatePath(EMPLOYEES_PATH, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al actualizar contrato");
  }
}

export async function activateContractAction(contractId: string) {
  try {
    const data = await EmploymentContractRequest.activate(contractId);
    revalidatePath(EMPLOYEES_PATH, "layout");
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Error al activar contrato");
  }
}
