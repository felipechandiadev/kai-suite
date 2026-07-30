import { AccountBalance } from '../../domain/account-balance.entity';

export interface LedgerEntryBalancePayload {
  transactionId: string;
  accountId: string;
  debit: number;
  credit: number;
}

export interface AccountBalanceRepositoryPort {
  updateBalancesForLedgerEntries(
    ledgerEntries: LedgerEntryBalancePayload[],
  ): Promise<void>;
  freezeBalancesForPeriod(periodId: string): Promise<void>;
  findBalancesForPeriod(
    companyId: string,
    periodId: string,
  ): Promise<AccountBalance[]>;
}
