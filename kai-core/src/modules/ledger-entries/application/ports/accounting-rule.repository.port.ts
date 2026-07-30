import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';

export interface AccountingRuleRepositoryPort {
  findById(id: string): Promise<AccountingRule | null>;
  findByScope(scope: string): Promise<AccountingRule[]>;
  findByTransactionType(transactionType: string): Promise<AccountingRule[]>;
  findAll(): Promise<AccountingRule[]>;
  find(options?: any): Promise<AccountingRule[]>; // Generic find method
}