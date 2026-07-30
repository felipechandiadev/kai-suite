"use server";

import { revalidatePath } from "next/cache";
import {
  CompanyRequest,
  type AddCompanyBankAccountInput,
  type CompanyDetails,
  type UpdateCompanyGeneralInput,
} from "@/features/settings-branches/infrastructure/company.request";

export async function getCompanyDetailsAction(): Promise<CompanyDetails | null> {
  return CompanyRequest.getDetails();
}

export async function updateCompanyGeneralAction(input: UpdateCompanyGeneralInput): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await CompanyRequest.patchGeneral(input);
    revalidatePath("/settings/company");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

export async function addCompanyBankAccountAction(input: AddCompanyBankAccountInput): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await CompanyRequest.addBankAccount(input);
    revalidatePath("/settings/company");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "No se pudo crear la cuenta." };
  }
}
