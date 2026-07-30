"use server";

import { AccountingLedgerRequest } from "../infrastructure/accounting-ledger.request";
import type { LedgerAccountsListResult } from "../types/ledger-account.types";

export async function listLedgerAccountsAction(opts: {
  includeInactive?: boolean;
} = {}): Promise<LedgerAccountsListResult> {
  return AccountingLedgerRequest.listAccounts(opts);
}
