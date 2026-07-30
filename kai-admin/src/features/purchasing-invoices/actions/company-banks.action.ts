"use server";

import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";

export async function loadCompanyBankAccountsForPurchasingAction(): Promise<CompanyBankAccountItem[]> {
  const d = await GetCompanyUseCase.execute();
  return d?.bankAccounts ?? [];
}
