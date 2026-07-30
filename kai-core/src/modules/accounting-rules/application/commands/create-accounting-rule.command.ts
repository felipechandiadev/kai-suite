import { Command } from '@nestjs/cqrs';
import { AccountingRule, RuleScope } from '../../domain/accounting-rule.entity';
import {
  TransactionType,
  PaymentMethod,
} from '../../../transactions/domain/transaction.entity';

export class CreateAccountingRuleCommand extends Command<AccountingRule> {
  constructor(
    public readonly companyId: string,
    public readonly appliesTo: RuleScope,
    public readonly transactionType: TransactionType,
    public readonly debitAccountId: string,
    public readonly creditAccountId: string,
    public readonly priority: number,
    public readonly expenseCategoryId?: string,
    public readonly taxId?: string,
    public readonly paymentMethod?: PaymentMethod,
    public readonly isActive?: boolean,
  ) {
    super();
  }
}
