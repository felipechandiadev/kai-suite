"use server";

import { revalidatePath } from "next/cache";
import { AccountsReceivableRequest } from "../infrastructure/accounts-receivable.request";
import type {
  AccountsReceivableListForGridInput,
  AccountsReceivableListForGridResult,
  AccountsReceivablePaymentContext,
  CompleteAccountsReceivablePaymentInput,
} from "../types/accounts-receivable.types";

const AR_PATH = "/accounting/accounts-receivable";

export async function listAccountsReceivableForGridAction(
  input: AccountsReceivableListForGridInput = {},
): Promise<AccountsReceivableListForGridResult> {
  return AccountsReceivableRequest.listForGrid(input);
}

export async function getAccountsReceivablePaymentContextAction(
  installmentId: string,
): Promise<AccountsReceivablePaymentContext> {
  return AccountsReceivableRequest.getPaymentContext(installmentId);
}

export async function completeAccountsReceivablePaymentAction(
  input: CompleteAccountsReceivablePaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await AccountsReceivableRequest.completePayment(input);
  if (res.success) {
    revalidatePath(AR_PATH, "layout");
  }
  return res;
}
