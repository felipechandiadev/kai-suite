import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';

export interface AccountingAccountRepositoryPort {
  findById(id: string): Promise<AccountingAccount | null>;
  findByCode(code: string): Promise<AccountingAccount | null>;
  findByCompanyId(companyId: string): Promise<AccountingAccount[]>;
  find(options?: any): Promise<AccountingAccount[]>; // Generic find method
}