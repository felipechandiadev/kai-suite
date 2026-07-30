import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';

export interface AccountingAccountRepositoryPort {
  save(account: AccountingAccount): Promise<AccountingAccount>;
  findById(id: string): Promise<AccountingAccount | null>;
  findByCompany(companyId: string): Promise<AccountingAccount[]>;
  remove(id: string): Promise<void>;
}

export const ACCOUNTING_ACCOUNT_REPOSITORY = 'ACCOUNTING_ACCOUNT_REPOSITORY';
