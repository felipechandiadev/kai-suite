"use server";

import { revalidatePath } from "next/cache";
import { ListChartOfAccountsUseCase } from "../application/list-chart-of-accounts.usecase";
import { CreateChartOfAccountUseCase } from "../application/create-chart-of-account.usecase";
import type { CreateChartOfAccountFormInput } from "../domain/chart-of-account.entity";

const PATH = "/accounting/chart-of-accounts";

function revalidateChartOfAccountsRoute() {
  revalidatePath(PATH, "page");
}

export async function listChartOfAccountsForPage(input?: { includeInactive?: boolean }) {
  return ListChartOfAccountsUseCase.execute(input);
}

export async function createChartOfAccountAction(input: CreateChartOfAccountFormInput) {
  const result = await CreateChartOfAccountUseCase.execute(input);
  if (result.success) {
    revalidateChartOfAccountsRoute();
  }
  return result;
}

