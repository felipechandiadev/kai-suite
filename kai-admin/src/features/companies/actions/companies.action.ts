"use server";

import { revalidatePath } from "next/cache";
import { CompaniesRequest } from "../infrastructure/companies.request";
import type {
  CreateCompanyInput,
  UpdateCompanyInput,
} from "../types/company.types";

export async function listCompaniesAction(includeInactive = false) {
  return CompaniesRequest.list(includeInactive);
}

export async function getCompanyAction(id: string) {
  return CompaniesRequest.get(id);
}

export async function createCompanyAction(body: CreateCompanyInput) {
  const res = await CompaniesRequest.create(body);
  if (res.success) {
    revalidatePath("/settings/companies");
  }
  return res;
}

export async function updateCompanyAction(id: string, body: UpdateCompanyInput) {
  const res = await CompaniesRequest.update(id, body);
  if (res.success) {
    revalidatePath("/settings/companies");
  }
  return res;
}

export async function removeCompanyAction(id: string) {
  const res = await CompaniesRequest.remove(id);
  if (res.success) {
    revalidatePath("/settings/companies");
  }
  return res;
}

export async function listAvailableCompaniesAction() {
  return CompaniesRequest.listAvailable();
}

export async function switchCompanyAction(
  companyId: string | { multiCompanyMode: true },
) {
  return CompaniesRequest.switchCompany(companyId);
}
