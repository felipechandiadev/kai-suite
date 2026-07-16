"use server";

import { revalidatePath } from "next/cache";
import { CompaniesVoucherKindsRequest } from "../infrastructure/companies-voucher-kinds.request";
import type { CompanyVoucherKind } from "../types/company-voucher-kinds.types";

export async function getCompanyVoucherKindsAction(companyId: string) {
  return CompaniesVoucherKindsRequest.get(companyId);
}

export async function replaceCompanyVoucherKindsAction(
  companyId: string,
  voucherKinds: CompanyVoucherKind[],
) {
  const res = await CompaniesVoucherKindsRequest.replace(companyId, voucherKinds);
  if (res.success) {
    revalidatePath("/settings/companies");
    revalidatePath("/settings/company");
  }
  return res;
}
