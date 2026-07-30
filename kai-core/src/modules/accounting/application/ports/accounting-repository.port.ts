import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';

export interface AccountingRepositoryPort {
  findAccountingAccountById(id: string): Promise<AccountingAccount | null>;
  findLedgerEntriesByAccount(accountId: string): Promise<LedgerEntry[]>;
  saveLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry>;
}