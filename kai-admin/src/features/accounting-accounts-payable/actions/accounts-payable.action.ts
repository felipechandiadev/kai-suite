"use server";

import { revalidatePath } from "next/cache";
import { AccountsPayableRequest } from "../infrastructure/accounts-payable.request";
import type {
  AccountsPayableListFilters,
  AccountsPayableListResult,
  CompleteAccountsPayablePaymentInput,
} from "../types/accounts-payable.types";
import type { AccountsPayablePaymentContext } from "../types/accounts-payable.types";

const AP_PATH = "/accounting/accounts-payable";

export async function listAccountsPayableAction(
  filters: AccountsPayableListFilters = {},
): Promise<AccountsPayableListResult> {
  return AccountsPayableRequest.list(filters);
}

export async function getAccountsPayablePaymentContextAction(
  paymentId: string,
): Promise<AccountsPayablePaymentContext> {
  return AccountsPayableRequest.getPaymentContext(paymentId);
}

export async function completeAccountsPayablePaymentAction(
  input: CompleteAccountsPayablePaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await AccountsPayableRequest.completePayment(input);
  if (res.success) {
    revalidatePath(AP_PATH, "layout");
  }
  return res;
}
