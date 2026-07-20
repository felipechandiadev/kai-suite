"use server";

import { revalidatePath } from "next/cache";
import { TreasuryOperationsRequest } from "../infrastructure/treasury-operations.request";
import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";

const PATH = "/treasury/accounts/bank";

export async function postCapitalContributionAction(input: {
  shareholderId: string;
  bankAccountKey?: string;
  cashHubId?: string;
  amount: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postCapitalContribution(input);
    revalidatePath(PATH, "page");
    revalidatePath("/treasury/accounts/cash", "page");
    revalidatePath("/settings/company", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar aporte" };
  }
}

export async function postDividendWithdrawalAction(input: {
  shareholderId: string;
  bankAccountKey: string;
  amount: number;
  notes?: string;
  taxRetention?: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postDividendWithdrawal(input);
    revalidatePath(PATH, "page");
    revalidatePath("/settings/company", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar retiro" };
  }
}

export async function postCashDepositAction(input: {
  bankAccountKey: string;
  cashHubId: string;
  amount: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postCashDeposit(input);
    revalidatePath(PATH, "page");
    revalidatePath("/treasury/accounts/cash", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al registrar depósito" };
  }
}

export async function postBankToCashHubTransferAction(input: {
  bankAccountKey: string;
  cashHubId: string;
  amount: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await TreasuryOperationsRequest.postBankToCashHubTransfer(input);
    revalidatePath(PATH, "page");
    revalidatePath("/treasury/accounts/cash", "page");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al registrar giro a centro de efectivo",
    };
  }
}

export async function getBankAccountBookBalanceAction(
  bankAccountKey: string,
): Promise<{ success: true; bookBalance: number } | { success: false; error: string }> {
  try {
    const data = await CompanyRequest.getBankAccountBookBalance(bankAccountKey);
    return { success: true, bookBalance: data.bookBalance };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al obtener saldo libro" };
  }
}

export async function updateBankAccountBalanceAction(input: {
  bankAccountKey: string;
  currentBalance: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await CompanyRequest.updateBankAccountBalance(input.bankAccountKey, input.currentBalance);
    revalidatePath(PATH, "page");
    revalidatePath("/settings/company", "page");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error al actualizar saldo" };
  }
}
