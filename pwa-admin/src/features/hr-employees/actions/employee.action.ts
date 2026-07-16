"use server";

import { revalidatePath } from "next/cache";
import { EmployeeRequest } from "../infrastructure/employee.request";
import type {
  EmployeeDetailView,
  EmployeeGridRow,
  ResultCenterListItem,
  UpdateEmployeePayload,
  UpdateEmployeePersonPayload,
} from "../types/employee.types";

const EMPLOYEES_PATH = "/hr/employees";

export type CreateEmployeeFormInput = {
  firstName: string;
  lastName?: string;
  documentType: "RUT" | "PASSPORT" | "OTHER";
  documentNumber: string;
  email?: string;
  phone?: string;
  branchId?: string | null;
  employmentType: string;
  hireDate: string;
  baseSalary?: string | null;
};

export type CreateEmployeeResult = { success: true; id: string } | { success: false; error: string };

export async function listEmployeesForGridAction(opts: {
  includeTerminated?: boolean;
  status?: string;
  branchId?: string;
  companyId?: string;
} = {}): Promise<EmployeeGridRow[]> {
  return EmployeeRequest.list(opts);
}

export async function getEmployeeDetailAction(
  employeeId: string,
): Promise<{ success: true; employee: EmployeeDetailView } | { success: false; error: string }> {
  const id = employeeId?.trim();
  if (!id) {
    return { success: false, error: "Empleado no especificado." };
  }
  try {
    const employee = await EmployeeRequest.getById(id);
    if (!employee) {
      return { success: false, error: "No se encontró el empleado." };
    }
    return { success: true, employee };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo cargar el detalle del empleado.",
    };
  }
}

export async function updateEmployeePersonAction(
  personId: string,
  employeeId: string,
  payload: UpdateEmployeePersonPayload,
): Promise<{ success: true; employee: EmployeeDetailView } | { success: false; error: string }> {
  const fn = payload.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  const personRes = await EmployeeRequest.updatePerson(personId, {
    ...payload,
    firstName: fn,
    lastName: payload.lastName?.trim() || undefined,
    documentNumber: payload.documentNumber?.trim() || undefined,
    email: payload.email?.trim() || undefined,
    phone: payload.phone?.trim() || undefined,
    address: payload.address?.trim() || undefined,
  });
  if (!personRes.success) {
    return personRes;
  }
  const detailRes = await getEmployeeDetailAction(employeeId);
  if (!detailRes.success) {
    return detailRes;
  }
  revalidatePath(EMPLOYEES_PATH, "page");
  return {
    success: true,
    employee: {
      ...detailRes.employee,
      person: personRes.person,
    },
  };
}

export async function updateEmployeeAction(
  employeeId: string,
  payload: UpdateEmployeePayload,
): Promise<{ success: true; employee: EmployeeDetailView } | { success: false; error: string }> {
  const id = employeeId?.trim();
  if (!id) {
    return { success: false, error: "Empleado no especificado." };
  }
  if (payload.status === "TERMINATED") {
    const term = payload.terminationDate?.trim();
    if (!term) {
      return { success: false, error: "Indique la fecha de término para empleados terminados." };
    }
  }
  const res = await EmployeeRequest.update(id, payload);
  if (res.success) {
    revalidatePath(EMPLOYEES_PATH, "page");
  }
  return res;
}

export async function listResultCentersForEmployeeAction(): Promise<ResultCenterListItem[]> {
  return EmployeeRequest.listResultCenters();
}

export async function createEmployeeAction(
  input: CreateEmployeeFormInput,
): Promise<CreateEmployeeResult> {
  const fn = input.firstName?.trim() ?? "";
  if (!fn) {
    return { success: false, error: "El nombre es obligatorio." };
  }
  const docNum = input.documentNumber?.trim() ?? "";
  if (!docNum) {
    return { success: false, error: "El número de documento es obligatorio." };
  }
  const hireDate = input.hireDate?.trim() ?? "";
  if (!hireDate) {
    return { success: false, error: "La fecha de ingreso es obligatoria." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    return { success: false, error: "La fecha de ingreso debe tener formato AAAA-MM-DD." };
  }

  const personRes = await EmployeeRequest.createPerson({
    firstName: fn,
    lastName: input.lastName?.trim() || undefined,
    documentType: input.documentType,
    documentNumber: docNum,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
  });
  if (!personRes.success) {
    return personRes;
  }

  let baseSalary: string | null = null;
  if (input.baseSalary != null && String(input.baseSalary).trim() !== "") {
    const n = Math.round(Number(String(input.baseSalary).replace(/\D/g, "")) || 0);
    if (n > 0) {
      baseSalary = String(n);
    }
  }

  const empRes = await EmployeeRequest.create({
    personId: personRes.personId,
    branchId: input.branchId?.trim() || null,
    employmentType: input.employmentType?.trim() || "FULL_TIME",
    hireDate,
    baseSalary,
  });
  if (empRes.success) {
    revalidatePath(EMPLOYEES_PATH, "page");
  }
  return empRes;
}
