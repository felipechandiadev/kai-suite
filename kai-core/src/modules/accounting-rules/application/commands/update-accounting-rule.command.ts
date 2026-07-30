import { Command } from '@nestjs/cqrs';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { PaymentMethod } from '../../../transactions/domain/transaction.entity';

export class UpdateAccountingRuleCommand extends Command<AccountingRule> {
  constructor(
    public readonly id: string,
    public readonly expenseCategoryId?: string,
    public readonly taxId?: string,
    public readonly paymentMethod?: PaymentMethod,
    public readonly debitAccountId?: string,
    public readonly creditAccountId?: string,
    public readonly priority?: number,
    public readonly isActive?: boolean,
  ) {
    super();
  }
}
