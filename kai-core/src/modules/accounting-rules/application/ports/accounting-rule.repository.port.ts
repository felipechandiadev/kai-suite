import { AccountingRule } from '../../domain/accounting-rule.entity';

export interface AccountingRuleRepositoryPort {
  save(rule: AccountingRule): Promise<AccountingRule>;
  findById(id: string): Promise<AccountingRule | null>;
  findAll(companyId: string): Promise<AccountingRule[]>;
  findByTransactionType(
    companyId: string,
    transactionType: string,
  ): Promise<AccountingRule[]>;
  update(id: string, rule: Partial<AccountingRule>): Promise<AccountingRule>;
  deactivate(id: string): Promise<void>;
}
